//! Everything Heron watches for one pane, one round at a time: the agent
//! files (sent on to the frontend as they are), the subagents running, and
//! the model check, from the transcript the hooks name and the model they
//! report (or, while they do not know it, the model the heron-limits status
//! line shows).

use std::collections::HashMap;
use std::path::Path;
use std::time::SystemTime;

use log::trace;
use serde_json::Value;

use super::files::{self, Kind};
use super::model_check::{ModelCheck, Verdict};
use super::subagents;
use super::transcript::Transcript;

/// One `agent-update` for the frontend: `kind` is "state", "status",
/// "check" or "subagents".
pub struct Update {
    pub kind: &'static str,
    pub data: Value,
}

pub struct PaneWatch {
    modified: HashMap<Kind, SystemTime>,
    transcript: Option<Transcript>,
    check: ModelCheck,
    sent: Verdict,
    subagents: Value,
}

impl PaneWatch {
    pub fn new() -> Self {
        let check = ModelCheck::default();
        let sent = check.verdict();
        Self { modified: HashMap::new(), transcript: None, check, sent, subagents: Value::Array(Vec::new()) }
    }

    /// The updates of this round, in order. New answers are judged before a
    /// new selection is taken, so an answer that came before a switch is
    /// judged against the model it was asked of.
    pub fn poll(&mut self, dir: &Path, pty: u32) -> Vec<Update> {
        let mut updates = Vec::new();
        if let Some(state) = self.read_changed(dir, pty, Kind::State) {
            self.follow(&state);
            updates.push(Update { kind: "state", data: state });
        }
        let status = self.read_changed(dir, pty, Kind::Status);
        if let Some(transcript) = &mut self.transcript {
            for answer in transcript.read_new() {
                self.check.answered(&answer.model);
            }
        }
        if let Some(model) = self.read_changed(dir, pty, Kind::Model) {
            self.check.select(model.get("model").and_then(Value::as_str));
        }
        if let Some(status) = status {
            if let Some(model) = status.get("model").and_then(Value::as_str) {
                self.check.select_from_status_line(model);
            }
            updates.push(Update { kind: "status", data: status });
        }
        let verdict = self.check.verdict();
        if verdict != self.sent {
            updates.push(Update { kind: "check", data: serde_json::to_value(&verdict).unwrap_or_default() });
            self.sent = verdict;
        }
        let subagents = subagents::read(dir, &files::key(pty));
        if subagents != self.subagents {
            updates.push(Update { kind: "subagents", data: subagents.clone() });
            self.subagents = subagents;
        }
        updates
    }

    /// The hooks name the session's transcript; a new one (a new session, or
    /// /clear) starts the check over.
    fn follow(&mut self, state: &Value) {
        let Some(path) = state.get("transcript_path").and_then(Value::as_str) else { return };
        if self.transcript.as_ref().is_some_and(|t| t.path() == Path::new(path)) {
            return;
        }
        self.transcript = Some(Transcript::follow(path.into()));
        self.check.restart();
    }

    /// The file's JSON when it changed since the last round. Writers replace
    /// files in one step (write, then rename), so a read never sees half a
    /// file; one that cannot be read yet is tried again next round.
    fn read_changed(&mut self, dir: &Path, pty: u32, kind: Kind) -> Option<Value> {
        let file = files::path(dir, pty, kind);
        let modified = std::fs::metadata(&file).and_then(|m| m.modified()).ok()?;
        if self.modified.get(&kind) == Some(&modified) {
            return None;
        }
        self.modified.insert(kind, modified);
        match std::fs::read(&file).map(|b| serde_json::from_slice::<Value>(&b)) {
            Ok(Ok(data)) => Some(data),
            _ => {
                trace!("agent: pty {pty} {} unreadable, next round", kind.name());
                self.modified.remove(&kind);
                None
            }
        }
    }
}
