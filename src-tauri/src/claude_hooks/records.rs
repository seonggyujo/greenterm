//! What one hook event writes for the pane (pure): the agent state for the
//! state file, and the session's model for the model file.

use serde_json::{json, Value};

/// Longest command or path kept in a permission message.
const DETAIL_CHARS: usize = 80;

/// The state file's record, or None when the event changes no state. The
/// transcript lets agent/ check the model of each answer.
pub fn state_record(input: &Value) -> Option<Value> {
    let state = state_of(input)?;
    Some(json!({
        "session_id": input.get("session_id"),
        "cwd": input.get("cwd"),
        "transcript_path": input.get("transcript_path"),
        "state": state,
        "message": message_of(input),
    }))
}

/// The model file's record when the event tells the session's model:
/// SessionStart (not always, e.g. not after /clear) and PostModelSwitch.
pub fn model_record(input: &Value) -> Option<Value> {
    let field = match input.get("hook_event_name")?.as_str()? {
        "SessionStart" => "model",
        "PostModelSwitch" => "to_model",
        _ => return None,
    };
    let model = input.get(field)?.as_str().filter(|m| !m.is_empty())?;
    Some(json!({ "session_id": input.get("session_id"), "model": model }))
}

/// The agent state a hook event stands for, or None when it changes nothing.
fn state_of(input: &Value) -> Option<&'static str> {
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
        assert_eq!(state(json!({"hook_event_name": "PostModelSwitch"})), None);
    }

    #[test]
    fn the_state_names_the_transcript() {
        let input = json!({"hook_event_name": "Stop", "transcript_path": r"C:\t.jsonl", "cwd": r"C:\work"});
        let record = state_record(&input).unwrap();
        assert_eq!((record["state"].as_str(), record["transcript_path"].as_str()), (Some("done"), Some(r"C:\t.jsonl")));
    }

    #[test]
    fn the_model_comes_from_session_start_and_model_switches() {
        let model = |v: Value| model_record(&v).map(|r| r["model"].as_str().unwrap().to_owned());
        assert_eq!(model(json!({"hook_event_name": "SessionStart", "model": "claude-opus-5-5"})).as_deref(), Some("claude-opus-5-5"));
        assert_eq!(model(json!({"hook_event_name": "SessionStart", "source": "clear"})), None);
        let switch = json!({"hook_event_name": "PostModelSwitch", "from_model": "claude-opus-5-5", "to_model": "claude-sonnet-5-5"});
        assert_eq!(model(switch).as_deref(), Some("claude-sonnet-5-5"));
        assert_eq!(model(json!({"hook_event_name": "Stop", "model": "x"})), None);
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
