//! Tests for records.rs: which hook events change the agent state and the
//! model, and what the state file says.

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
    let record = state_record(&input, None).unwrap();
    assert_eq!((record["state"].as_str(), record["transcript_path"].as_str()), (Some("done"), Some(r"C:\t.jsonl")));
}

#[test]
fn a_permission_notification_keeps_the_request_detail() {
    let request = json!({"session_id": "s", "state": "permission", "message": "Bash: npm outdated"});
    let note = |session: &str| {
        let message = "Claude needs your permission";
        json!({"hook_event_name": "Notification", "notification_type": "permission_prompt", "session_id": session, "message": message})
    };
    let message = |input: Value, previous: Value| state_record(&input, Some(&previous)).unwrap()["message"].clone();
    assert_eq!(message(note("s"), request.clone()), "Bash: npm outdated");
    assert_eq!(message(note("other"), request.clone()), "Claude needs your permission");
    let done = json!({"session_id": "s", "state": "done", "message": null});
    assert_eq!(message(note("s"), done), "Claude needs your permission");
    let idle = json!({"hook_event_name": "Notification", "notification_type": "idle_prompt", "session_id": "s", "message": "Claude is waiting"});
    assert_eq!(message(idle, request), "Claude is waiting");
}

#[test]
fn the_model_comes_from_session_start_and_model_switches() {
    let model = |v: Value| model_record(&v).map(|r| r["model"].as_str().map(str::to_owned));
    let start = json!({"hook_event_name": "SessionStart", "source": "startup", "model": "claude-opus-5-5"});
    assert_eq!(model(start), Some(Some("claude-opus-5-5".into())));
    assert_eq!(model(json!({"hook_event_name": "SessionStart", "source": "resume"})), Some(None), "unknown");
    assert_eq!(model(json!({"hook_event_name": "SessionStart", "source": "clear"})), None, "unchanged");
    let switch = json!({"hook_event_name": "PostModelSwitch", "from_model": "claude-opus-5-5", "to_model": "claude-sonnet-5-5"});
    assert_eq!(model(switch), Some(Some("claude-sonnet-5-5".into())));
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

#[test]
fn subagents_start_stop_and_go_with_the_session() {
    let start = json!({"hook_event_name": "SubagentStart", "agent_id": "a1b2", "agent_type": "Explore"});
    let record = json!({"type": "Explore", "started": 42});
    assert_eq!(subagent_change(&start, 42), Some(SubagentChange::Start { id: "a1b2".into(), record }));
    let stop = json!({"hook_event_name": "SubagentStop", "agent_id": "a1b2", "agent_type": "Explore"});
    assert_eq!(subagent_change(&stop, 50), Some(SubagentChange::Stop { id: "a1b2".into() }));
    let event = |name: &str| subagent_change(&json!({"hook_event_name": name}), 0);
    assert_eq!(event("SessionStart"), Some(SubagentChange::Clear));
    assert_eq!(event("SessionEnd"), Some(SubagentChange::Clear));
    assert_eq!(event("SubagentStart"), None, "no agent_id");
    assert_eq!(event("Stop"), None);
}
