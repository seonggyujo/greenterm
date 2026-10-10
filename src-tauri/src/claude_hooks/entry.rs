//! heron.exe run by Claude Code as a hook (`heron.exe --agent-hook`).
//! It writes what the hook event tells (records.rs) into the pane's files,
//! the ones agent/ watches, and exits. It prints nothing, because the
//! output of some hooks is added to the conversation. Outside a Heron
//! pane it exits before reading anything.

use std::io::Read;
use std::path::{Path, PathBuf};

use serde_json::Value;

use super::records::{model_record, state_record};
use super::write_atomic;
use crate::agent::{is_pane_key, pane_file, FileKind};

pub fn run() -> i32 {
    let Some((dir, pane)) = pane() else { return 0 };
    let mut raw = String::new();
    if std::io::stdin().read_to_string(&mut raw).is_err() {
        return 0;
    }
    // A byte order mark, as some writers put first, is not JSON.
    let Ok(input) = serde_json::from_str::<Value>(raw.trim_start_matches('\u{feff}')) else { return 0 };
    // A failed write only loses this one update.
    if let Some(record) = state_record(&input) {
        let _ = write_atomic(&pane_file(&dir, &pane, FileKind::State), &record.to_string());
    }
    if let Some(record) = model_record(&input) {
        let _ = write_atomic(&pane_file(&dir, &pane, FileKind::Model), &record.to_string());
    }
    0
}

/// The agent folder and the pane's key, from the variables Heron gives each
/// shell.
fn pane() -> Option<(PathBuf, String)> {
    let pane = std::env::var("HERON_PANE").ok()?;
    let dir = std::env::var_os("HERON_AGENT_DIR")?;
    is_pane_key(&pane).then(|| (Path::new(&dir).to_owned(), pane))
}
