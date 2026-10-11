//! Names and cleanup of the files agents write for a pane.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use log::debug;

/// Files older than this are leftovers of a run that did not clean up.
const STALE_AFTER: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Kind {
    /// Written by the heron-limits plugin's status line: usage limits,
    /// context use.
    Status,
    /// Written by hooks: working, needs permission, waiting, done, and the
    /// transcript.
    State,
    /// Written by hooks: the model the session uses.
    Model,
}

pub const KINDS: [Kind; 3] = [Kind::Status, Kind::State, Kind::Model];

impl Kind {
    pub fn name(self) -> &'static str {
        match self {
            Kind::Status => "status",
            Kind::State => "state",
            Kind::Model => "model",
        }
    }
}

/// Unique among running Heron windows: the process id, then the pty id.
pub fn key(pty: u32) -> String {
    format!("{}-{pty}", std::process::id())
}

/// A key as `key` makes it, so a file name built from it stays in `dir`.
pub fn is_key(text: &str) -> bool {
    let digits = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit());
    text.split_once('-').is_some_and(|(pid, pty)| digits(pid) && digits(pty))
}

/// The file of pane `key` (see `key`).
pub fn path_for(dir: &Path, key: &str, kind: Kind) -> PathBuf {
    dir.join(format!("{key}.{}.json", kind.name()))
}

pub fn path(dir: &Path, pty: u32, kind: Kind) -> PathBuf {
    path_for(dir, &key(pty), kind)
}

pub fn remove_pane(dir: &Path, pty: u32) {
    for kind in KINDS {
        let file = path(dir, pty, kind);
        if fs::remove_file(&file).is_ok() {
            debug!("agent: removed {}", file.display());
        }
    }
    remove_subagents(dir, &key(pty));
}

/// A subagent id as Claude Code gives it (letters, digits, `-`, `_`), so a
/// file name built from it stays in `dir`.
pub fn is_subagent_id(text: &str) -> bool {
    !text.is_empty() && text.len() <= 64 && text.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// Written by hooks while a subagent of pane `key` runs: `<key>.sub.<id>.json`.
pub fn subagent_path(dir: &Path, key: &str, id: &str) -> PathBuf {
    dir.join(format!("{key}.sub.{id}.json"))
}

/// The subagent files of pane `key`, with the id of each.
pub fn subagent_files(dir: &Path, key: &str) -> Vec<(String, PathBuf)> {
    let prefix = format!("{key}.sub.");
    let Ok(entries) = fs::read_dir(dir) else { return Vec::new() };
    entries
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name().into_string().ok()?;
            let id = name.strip_prefix(&prefix)?.strip_suffix(".json")?;
            is_subagent_id(id).then(|| (id.to_owned(), entry.path()))
        })
        .collect()
}

pub fn remove_subagents(dir: &Path, key: &str) {
    for (_, file) in subagent_files(dir, key) {
        if fs::remove_file(&file).is_ok() {
            debug!("agent: removed {}", file.display());
        }
    }
}

pub fn remove_stale(dir: &Path) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    let now = SystemTime::now();
    for entry in entries.flatten() {
        let old = entry
            .metadata()
            .and_then(|m| m.modified())
            .is_ok_and(|t| now.duration_since(t).unwrap_or_default() > STALE_AFTER);
        if old && fs::remove_file(entry.path()).is_ok() {
            debug!("agent: removed stale {}", entry.path().display());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_subagent_id_cannot_leave_the_folder() {
        assert!(is_subagent_id("a65cc6212ebfce9ef"));
        assert!(is_subagent_id("agent_1-x"));
        for bad in ["", "..", "a/b", r"a\b", "a.b", "a:b"] {
            assert!(!is_subagent_id(bad), "{bad}");
        }
    }
}
