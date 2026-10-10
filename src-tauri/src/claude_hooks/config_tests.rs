//! Tests for config.rs: Heron's entries come and go without touching
//! anything else in the user's settings.

use serde_json::{json, Value};

use super::config::{add, presence, remove, Presence};

const EXE: &str = r"C:\Users\me\AppData\Local\Heron\heron.exe";

fn user_settings() -> Value {
    json!({
        "model": "opus",
        "hooks": {
            "Stop": [{"hooks": [{"type": "command", "command": "say done"}]}],
            "PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command", "command": "check.sh"}]}]
        },
        "statusLine": {"type": "command", "command": "status.sh"}
    })
}

#[test]
fn add_then_remove_gives_back_the_same_file() {
    let original = user_settings();
    let mut settings = original.clone();
    add(&mut settings, EXE).unwrap();
    assert_eq!(presence(&settings, EXE), Presence::Current);
    assert_eq!(settings["hooks"]["Stop"].as_array().unwrap().len(), 2);
    assert!(remove(&mut settings));
    // Same keys in the same order, so the file reads the same.
    assert_eq!(serde_json::to_string(&settings).unwrap(), serde_json::to_string(&original).unwrap());
}

#[test]
fn an_empty_file_gets_and_loses_a_hooks_object() {
    let mut settings = json!({});
    assert_eq!(presence(&settings, EXE), Presence::Absent);
    add(&mut settings, EXE).unwrap();
    let entry = &settings["hooks"]["SessionStart"][0];
    assert_eq!(entry["matcher"], "startup|resume|clear");
    assert_eq!(entry["hooks"][0]["args"], json!(["--agent-hook"]));
    remove(&mut settings);
    assert_eq!(settings, json!({}));
}

#[test]
fn entries_for_another_exe_are_stale_and_get_replaced() {
    let mut settings = user_settings();
    add(&mut settings, r"D:\old\heron.exe").unwrap();
    assert_eq!(presence(&settings, EXE), Presence::Stale);
    add(&mut settings, EXE).unwrap();
    assert_eq!(presence(&settings, EXE), Presence::Current);
    assert_eq!(settings["hooks"]["UserPromptSubmit"].as_array().unwrap().len(), 1);
}

#[test]
fn hooks_of_other_programs_are_not_ours() {
    let mut settings = json!({"hooks": {"Stop": [{"hooks": [
        {"type": "command", "command": "node", "args": ["--agent-hook"]},
        {"type": "command", "command": r"C:\heron.exe"}
    ]}]}});
    let before = settings.clone();
    assert_eq!(presence(&settings, EXE), Presence::Absent);
    assert!(!remove(&mut settings));
    assert_eq!(settings, before);
}

#[test]
fn a_file_of_another_shape_is_refused() {
    let mut settings = json!({"hooks": []});
    assert!(add(&mut settings, EXE).is_err());
    let mut settings = json!({"hooks": {"Stop": {"not": "a list"}}});
    assert!(add(&mut settings, EXE).is_err());
}
