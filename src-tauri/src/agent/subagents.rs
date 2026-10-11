//! The subagents running in one pane: Heron's hooks write one small file per
//! subagent when it starts and delete it when it stops
//! (claude_hooks/entry.rs). Read as a list for the frontend, oldest first.

use std::path::Path;

use serde_json::{json, Value};

use super::files;

/// `[{ id, type, started }]` for pane `key`; `started` is ms since 1970.
pub fn read(dir: &Path, key: &str) -> Value {
    let mut list: Vec<Value> = files::subagent_files(dir, key)
        .into_iter()
        .filter_map(|(id, file)| {
            let record: Value = serde_json::from_slice(&std::fs::read(file).ok()?).ok()?;
            Some(json!({ "id": id, "type": record.get("type"), "started": record.get("started") }))
        })
        .collect();
    list.sort_by_key(|s| (s["started"].as_u64().unwrap_or(0), s["id"].as_str().unwrap_or_default().to_owned()));
    Value::Array(list)
}
