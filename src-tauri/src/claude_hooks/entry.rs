//! heron.exe run by Claude Code as a hook (`heron.exe --agent-hook`).
//! It writes the state the hook event stands for into the pane's state file
//! (the file agent/ watches) and exits. It prints nothing, because the
//! output of some hooks is added to the conversation. Outside a Heron
//! pane it exits before reading anything.

use std::io::Read;
use std::path::{Path, PathBuf};

use serde_json::{json, Value};

use super::write_atomic;
use crate::agent::{is_pane_key, pane_file, FileKind};

/// Longest command or path kept in a permission message.
const DETAIL_CHARS: usize = 80;

pub fn run() -> i32 {
    let Some(file) = state_file() else { return 0 };
    let mut raw = String::new();
    if std::io::stdin().read_to_string(&mut raw).is_err() {
        return 0;
    }
    // A byte order mark, as some writers put first, is not JSON.
    let Ok(input) = serde_json::from_str::<Value>(raw.trim_start_matches('\u{feff}')) else { return 0 };
    let Some(state) = state_of(&input) else { return 0 };
    let record = json!({
        "session_id": input.get("session_id"),
        "cwd": input.get("cwd"),
        "state": state,
        "message": message_of(&input),
    });
    // A failed write only loses this one update.
    let _ = write_atomic(&file, &record.to_string());
    0
}

/// The pane's state file, from the variables Heron gives each shell.
fn state_file() -> Option<PathBuf> {
    let pane = std::env::var("HERON_PANE").ok()?;
    let dir = std::env::var_os("HERON_AGENT_DIR")?;
    is_pane_key(&pane).then(|| pane_file(Path::new(&dir), &pane, FileKind::State))
}

/// The agent state a hook event stands for, or None when it changes nothing.
/// The same states the routing-detector plugin writes.
pub fn state_of(input: &Value) -> Option<&'static str> {
    Some(match input.get("hook_event_name")?.as_str()? {
        "SessionStart" => "idle",
        "UserPromptSubmit" => "working",
        "PermissionRequest" => "permission",
        "Stop" | "StopFailure" => "done",
        "SessionEnd" => "ended",
        "Notification" => match input.get("notification_type")?.as_str()? {
            "permission_prompt" => "permission",
            "idle_prompt" => "waiting",
            "elicitation_dialog" => "question",
            _ => return None,
        },
        _ => return None,
    })
}

/// What the agent waits for: the notification text, or the tool asking for
/// permission with its command, file or address.
fn message_of(input: &Value) -> Option<String> {
    match input.get("hook_event_name")?.as_str()? {
        "Notification" => input.get("message")?.as_str().map(str::to_owned),
        "PermissionRequest" => {
            let tool = input.get("tool_name")?.as_str()?;
            let args = input.get("tool_input");
            let detail = ["command", "file_path", "url"]
                .iter()
                .find_map(|key| args?.get(key)?.as_str());
            Some(match detail {
                Some(detail) => format!("{tool}: {}", shorten(detail)),
                None => tool.to_owned(),
            })
        }
        _ => None,
    }
}

fn shorten(text: &str) -> String {
    let line = text.lines().next().unwrap_or_default();
    if line.chars().count() <= DETAIL_CHARS {
        return line.to_owned();
    }
    line.chars().take(DETAIL_CHARS).chain(['…']).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_events_to_states() {
        let state = |v: Value| state_of(&v);
        assert_eq!(state(json!({"hook_event_name": "UserPromptSubmit"})), Some("working"));
        assert_eq!(state(json!({"hook_event_name": "StopFailure"})), Some("done"));
        assert_eq!(state(json!({"hook_event_name": "PermissionRequest"})), Some("permission"));
        let note = |t: &str| json!({"hook_event_name": "Notification", "notification_type": t});
        assert_eq!(state(note("idle_prompt")), Some("waiting"));
        assert_eq!(state(note("auth_success")), None);
        assert_eq!(state(json!({"hook_event_name": "PreToolUse"})), None);
    }

    #[test]
    fn permission_message_names_the_tool_and_its_command() {
        let input = json!({
            "hook_event_name": "PermissionRequest",
            "tool_name": "Bash",
            "tool_input": {"command": "ping -n 40 127.0.0.1\necho done"},
        });
        assert_eq!(message_of(&input).as_deref(), Some("Bash: ping -n 40 127.0.0.1"));
        let long = "x".repeat(DETAIL_CHARS + 5);
        assert_eq!(shorten(&long).chars().count(), DETAIL_CHARS + 1);
    }
}
