//! Tauri commands. Thin layer: argument plumbing only, logic lives in `pty`,
//! `agent` and `claude_hooks`.

use std::path::Path;
use std::thread;

use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::{AppHandle, State};

use crate::agent::AgentLink;
use crate::claude_hooks::{self, Presence};
use crate::pty::{PtyRegistry, ShellKind};

/// Shells installed on this machine, for the shell menu.
#[tauri::command(async)]
pub fn list_shells() -> Vec<ShellKind> {
    ShellKind::available()
}

/// Runs off the main thread: starting a process can take a few ms. The
/// shell gets the pane's agent variables (see agent/mod.rs).
#[allow(clippy::too_many_arguments)] // Tauri passes command arguments one by one
#[tauri::command(async)]
pub fn spawn_pty(
    app: AppHandle,
    registry: State<'_, PtyRegistry>,
    agent: State<'_, AgentLink>,
    shell: ShellKind,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
    on_output: Channel<InvokeResponseBody>,
) -> Result<u32, String> {
    let id = registry.spawn(app, shell, cols, rows, on_output, |id| {
        let mut cmd = shell.command(cwd.as_deref().map(Path::new))?;
        for (key, value) in agent.pane_env(id) {
            cmd.env(key, value);
        }
        Ok(cmd)
    })?;
    agent.track(id);
    Ok(id)
}

/// Sync command on the main thread so keystrokes keep their order. It only
/// queues bytes for the writer thread.
#[tauri::command]
pub fn write_pty(registry: State<'_, PtyRegistry>, id: u32, data: String) -> Result<(), String> {
    registry.get(id)?.write(data.into_bytes())
}

#[tauri::command]
pub fn resize_pty(
    registry: State<'_, PtyRegistry>,
    id: u32,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    registry.get(id)?.resize(cols, rows)
}

#[tauri::command]
pub fn pause_pty(registry: State<'_, PtyRegistry>, id: u32) -> Result<(), String> {
    registry.get(id)?.pause();
    Ok(())
}

#[tauri::command]
pub fn resume_pty(registry: State<'_, PtyRegistry>, id: u32) -> Result<(), String> {
    registry.get(id)?.resume();
    Ok(())
}

/// Closing the pseudo console may wait on conhost, so it runs on its own
/// thread and the UI never stalls.
#[tauri::command]
pub fn kill_pty(registry: State<'_, PtyRegistry>, agent: State<'_, AgentLink>, id: u32) {
    agent.forget(id);
    if let Some(session) = registry.remove(id) {
        thread::spawn(move || session.kill());
    }
}

/// Whether greenterm's hooks are in Claude Code's settings (claude_hooks/).
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

/// Frontend log lines, printed in the `tauri dev` terminal.
#[tauri::command]
pub fn frontend_log(level: String, scope: String, message: String) {
    let level = match level.as_str() {
        "error" => log::Level::Error,
        "warn" => log::Level::Warn,
        "info" => log::Level::Info,
        "trace" => log::Level::Trace,
        _ => log::Level::Debug,
    };
    log::log!(target: "web", level, "[{scope}] {message}");
}
