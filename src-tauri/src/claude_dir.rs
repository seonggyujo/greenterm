//! Claude Code's config folder: CLAUDE_CONFIG_DIR, or `%USERPROFILE%\.claude`.
//! `claude_hooks/` finds settings.json in it, `sessions/` the session files.

use std::path::PathBuf;

pub fn config_dir() -> Option<PathBuf> {
    match std::env::var_os("CLAUDE_CONFIG_DIR") {
        Some(dir) => Some(PathBuf::from(dir)),
        None => Some(PathBuf::from(std::env::var_os("USERPROFILE")?).join(".claude")),
    }
}
