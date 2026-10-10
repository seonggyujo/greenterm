//! Link to coding agents (Claude Code) running in the panes. greenterm puts
//! two invisible variables in every shell:
//!   GREENTERM_PANE       the pane's key, `<greenterm pid>-<pty id>`
//!   GREENTERM_AGENT_DIR  the folder to write into
//! An agent integration that sees them (greenterm's own hooks, see
//! claude_hooks/, or the routing-detector status line and hooks) writes
//! `<key>.status.json` and `<key>.state.json` there. This module watches
//! those files for live panes and forwards each change to the frontend as an
//! `agent-update` event. It never talks to the agent itself.

mod files;
mod poll;

pub use files::{is_key as is_pane_key, path_for as pane_file, Kind as FileKind};

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use log::{debug, warn};
use tauri::AppHandle;

pub struct AgentLink {
    dir: PathBuf,
    panes: Arc<Mutex<HashSet<u32>>>,
}

impl AgentLink {
    /// Creates the folder and clears files left by earlier runs.
    pub fn new(dir: PathBuf) -> Self {
        if let Err(e) = std::fs::create_dir_all(&dir) {
            warn!("agent: cannot create {}: {e}", dir.display());
        }
        files::remove_stale(&dir);
        debug!("agent: watching {}", dir.display());
        Self { dir, panes: Arc::default() }
    }

    /// Variables for the shell of pane `pty`.
    pub fn pane_env(&self, pty: u32) -> [(&'static str, String); 2] {
        [
            ("GREENTERM_PANE", files::key(pty)),
            ("GREENTERM_AGENT_DIR", self.dir.to_string_lossy().into_owned()),
        ]
    }

    pub fn track(&self, pty: u32) {
        self.panes.lock().unwrap().insert(pty);
    }

    /// The pane closed: stop watching it and delete its files.
    pub fn forget(&self, pty: u32) {
        self.panes.lock().unwrap().remove(&pty);
        files::remove_pane(&self.dir, pty);
    }

    /// App exit or page reload: every pane is gone.
    pub fn forget_all(&self) {
        let panes: Vec<u32> = self.panes.lock().unwrap().drain().collect();
        for pty in panes {
            files::remove_pane(&self.dir, pty);
        }
    }

    pub fn start(&self, app: AppHandle) {
        poll::spawn(app, self.dir.clone(), self.panes.clone());
    }
}
