//! Heron's entries in the `hooks` of Claude Code's settings, as pure
//! edits of the parsed file: add them (replacing older ones), remove them,
//! and tell whether they are there. An entry is Heron's when it runs
//! heron.exe with `--agent-hook`; the user's own hooks are never touched.

use serde::Serialize;
use serde_json::{json, Map, Value};

use super::HOOK_FLAG;

/// The events Heron listens to, with the matcher of each. The `args` form
/// of the entries needs Claude Code 2.1.139, which version.rs checks. All
/// exist since then but PostModelSwitch (2.1.251), and an older Claude Code
/// skips an event name it does not know (since 2.1.101).
const EVENTS: [(&str, Option<&str>); 8] = [
    // Not "compact": a compaction can happen in the middle of a turn.
    ("SessionStart", Some("startup|resume|clear")),
    ("UserPromptSubmit", None),
    ("PermissionRequest", None),
    ("Notification", Some("permission_prompt|idle_prompt|elicitation_dialog")),
    ("Stop", None),
    ("StopFailure", None),
    ("SessionEnd", None),
    ("PostModelSwitch", None),
];

/// The hook exits at once; this only bounds a stuck one.
const TIMEOUT_SECONDS: u64 = 10;

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Presence {
    Absent,
    /// Every event runs this heron.exe.
    Current,
    /// Some entries are missing or run another heron.exe (moved, or an
    /// older install).
    Stale,
}

pub fn presence(settings: &Value, exe: &str) -> Presence {
    let hooks = settings.get("hooks");
    let ours = |event: &str| entries(hooks, event).filter(|h| is_ours(h)).collect::<Vec<_>>();
    if EVENTS.iter().all(|(event, _)| ours(event).is_empty()) {
        return Presence::Absent;
    }
    let current = EVENTS.iter().all(|(event, _)| {
        let found = ours(event);
        found.len() == 1 && found[0].get("command").and_then(Value::as_str) == Some(exe)
    });
    if current {
        Presence::Current
    } else {
        Presence::Stale
    }
}

/// Puts Heron's entries in, running `exe`. Fails when the file's shape
/// is not what Claude Code expects, so nothing of it is overwritten.
pub fn add(settings: &mut Value, exe: &str) -> Result<(), &'static str> {
    remove(settings);
    let root = settings.as_object_mut().ok_or("settings is not an object")?;
    let hooks = root.entry("hooks").or_insert_with(|| json!({}));
    let hooks = hooks.as_object_mut().ok_or("hooks is not an object")?;
    for (event, matcher) in EVENTS {
        let groups = hooks.entry(event).or_insert_with(|| json!([]));
        let groups = groups.as_array_mut().ok_or("a hook event is not a list")?;
        let mut group = Map::new();
        if let Some(matcher) = matcher {
            group.insert("matcher".into(), json!(matcher));
        }
        let hook = json!({"type": "command", "command": exe, "args": [HOOK_FLAG], "timeout": TIMEOUT_SECONDS});
        group.insert("hooks".into(), json!([hook]));
        groups.push(Value::Object(group));
    }
    Ok(())
}

/// Takes Heron's entries out, and any group, event or `hooks` object
/// that only they filled. Returns whether anything changed.
pub fn remove(settings: &mut Value) -> bool {
    let Some(hooks) = settings.get_mut("hooks").and_then(Value::as_object_mut) else { return false };
    let mut changed = false;
    for groups in hooks.values_mut().filter_map(Value::as_array_mut) {
        groups.retain_mut(|group| {
            let Some(list) = group.get_mut("hooks").and_then(Value::as_array_mut) else { return true };
            let before = list.len();
            list.retain(|h| !is_ours(h));
            changed |= list.len() != before;
            !(list.is_empty() && before > 0)
        });
    }
    if changed {
        hooks.retain(|_, groups| groups.as_array().is_none_or(|g| !g.is_empty()));
        if hooks.is_empty() {
            settings.as_object_mut().map(|root| root.remove("hooks"));
        }
    }
    changed
}

fn entries<'a>(hooks: Option<&'a Value>, event: &str) -> impl Iterator<Item = &'a Value> {
    hooks
        .and_then(|h| h.get(event))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|group| group.get("hooks").and_then(Value::as_array))
        .flatten()
}

fn is_ours(hook: &Value) -> bool {
    let flag = hook.get("args").and_then(Value::as_array).is_some_and(|a| a.len() == 1 && a[0] == HOOK_FLAG);
    let exe = hook.get("command").and_then(Value::as_str);
    flag && exe.is_some_and(|c| c.to_ascii_lowercase().ends_with("heron.exe"))
}
