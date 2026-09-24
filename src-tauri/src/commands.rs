//! Tauri commands. Thin layer: argument plumbing only, logic lives in `pty`.

use std::path::Path;
use std::thread;

use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::{AppHandle, State};

use crate::pty::{PtyRegistry, ShellKind};

/// Shells installed on this machine, for the shell menu.
#[tauri::command(async)]
pub fn list_shells() -> Vec<ShellKind> {
    ShellKind::available()
}

/// Runs off the main thread: starting a process can take a few ms.
#[tauri::command(async)]
pub fn spawn_pty(
    app: AppHandle,
    registry: State<'_, PtyRegistry>,
    shell: ShellKind,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
    on_output: Channel<InvokeResponseBody>,
) -> Result<u32, String> {
    registry.spawn(app, shell, cols, rows, cwd.as_deref().map(Path::new), on_output)
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
pub fn kill_pty(registry: State<'_, PtyRegistry>, id: u32) {
    if let Some(session) = registry.remove(id) {
        thread::spawn(move || session.kill());
    }
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
