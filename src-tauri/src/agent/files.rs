//! Names and cleanup of the files agents write for a pane.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use log::debug;

/// Files older than this are leftovers of a run that did not clean up.
const STALE_AFTER: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Kind {
    /// Written by the status line: model check, limits, context use.
    Status,
    /// Written by hooks: working, needs permission, waiting, done.
    State,
}

pub const KINDS: [Kind; 2] = [Kind::Status, Kind::State];

impl Kind {
    pub fn name(self) -> &'static str {
        match self {
            Kind::Status => "status",
            Kind::State => "state",
        }
    }
}

/// Unique among running greenterm windows: the process id, then the pty id.
pub fn key(pty: u32) -> String {
    format!("{}-{pty}", std::process::id())
}

pub fn path(dir: &Path, pty: u32, kind: Kind) -> PathBuf {
    dir.join(format!("{}.{}.json", key(pty), kind.name()))
}

pub fn remove_pane(dir: &Path, pty: u32) {
    for kind in KINDS {
        let file = path(dir, pty, kind);
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
