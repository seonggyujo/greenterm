//! Commands for Claude Code: Heron's hooks in its settings (`claude_hooks`)
//! and its sessions on this PC (`sessions`).

use crate::claude_hooks::{self, Presence};
use crate::sessions;

/// Sessions the sidebar lists.
const RECENT_SESSIONS: usize = 20;

/// Whether Heron's hooks are in Claude Code's settings (claude_hooks/).
#[tauri::command(async)]
pub fn agent_hooks_presence() -> Result<Presence, String> {
    claude_hooks::presence().map_err(|e| e.code())
}

/// Async: it runs `claude --version` first.
#[tauri::command(async)]
pub fn install_agent_hooks() -> Result<(), String> {
    claude_hooks::install().map_err(|e| e.code())
}

#[tauri::command(async)]
pub fn remove_agent_hooks() -> Result<(), String> {
    claude_hooks::remove().map_err(|e| e.code())
}

/// Claude Code's recent sessions, newest first, for the sidebar (sessions/).
/// Async: it reads the end of each session file.
#[tauri::command(async)]
pub fn recent_sessions() -> Vec<sessions::RecentSession> {
    sessions::recent(RECENT_SESSIONS)
}

/// Moves a session to the Recycle Bin. Rejects with "not-found", "running" or "io".
#[tauri::command(async)]
pub fn delete_session(id: String) -> Result<(), String> {
    sessions::delete(&id).map_err(str::to_owned)
}

/// Of `ids`, the sessions a reopened pane can resume: saved, and not
/// running elsewhere.
#[tauri::command(async)]
pub fn resumable_sessions(ids: Vec<String>) -> Vec<String> {
    sessions::resumable(&ids)
}
