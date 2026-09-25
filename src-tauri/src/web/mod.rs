//! Web panes: child webviews laid over a pane body in the main window.
//! The frontend owns the layout and sends each webview its box in logical
//! (CSS) pixels. Pages get no IPC: Tauri rejects app commands from remote
//! origins, and no capability grants remote URLs anything.

mod page;
pub mod profile;

use log::{debug, info, trace, warn};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Rect, Runtime, Webview};

/// Web pane labels start with this, so no command can touch "main".
const PREFIX: &str = "web-";

fn check_label(label: &str) -> Result<(), String> {
    if label.starts_with(PREFIX) {
        Ok(())
    } else {
        Err(format!("{label} is not a web pane"))
    }
}

fn find(app: &AppHandle, label: &str) -> Result<Webview, String> {
    check_label(label)?;
    app.get_webview(label)
        .ok_or_else(|| format!("web pane {label} not found"))
}

fn fail(e: tauri::Error) -> String {
    e.to_string()
}

/// Async: creating a webview from a sync command deadlocks on Windows.
#[tauri::command(async)]
#[allow(clippy::too_many_arguments)]
pub fn web_open(
    webview: Webview,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    check_label(&label)?;
    let url = page::parse_url(&url)?;
    info!("web: opening {label} at {x},{y} {width}x{height}: {url}");
    let data = profile::dir(webview.app_handle())?;
    let builder = page::builder(&label, url, data, webview.app_handle().clone());
    webview
        .window()
        .add_child(builder, LogicalPosition::new(x, y), LogicalSize::new(width, height))
        .map_err(fail)?;
    info!("web: opened {label}");
    Ok(())
}

/// Sync, so boxes sent while a divider is dragged arrive in order.
#[tauri::command]
pub fn web_bounds(
    app: AppHandle,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    trace!("web: {label} bounds {x},{y} {width}x{height}");
    let rect = Rect {
        position: LogicalPosition::new(x, y).into(),
        size: LogicalSize::new(width, height).into(),
    };
    find(&app, &label)?.set_bounds(rect).map_err(fail)
}

#[tauri::command]
pub fn web_visible(app: AppHandle, label: String, visible: bool) -> Result<(), String> {
    let webview = find(&app, &label)?;
    debug!("web: {label} {}", if visible { "shown" } else { "hidden" });
    if visible { webview.show() } else { webview.hide() }.map_err(fail)
}

#[tauri::command]
pub fn web_navigate(app: AppHandle, label: String, url: String) -> Result<(), String> {
    let url = page::parse_url(&url)?;
    debug!("web: {label} -> {url}");
    find(&app, &label)?.navigate(url).map_err(fail)
}

#[tauri::command]
pub fn web_back(app: AppHandle, label: String) -> Result<(), String> {
    debug!("web: {label} back");
    find(&app, &label)?.eval("history.back()").map_err(fail)
}

#[tauri::command]
pub fn web_reload(app: AppHandle, label: String) -> Result<(), String> {
    debug!("web: {label} reload");
    find(&app, &label)?.reload().map_err(fail)
}

#[tauri::command]
pub fn web_focus(app: AppHandle, label: String) -> Result<(), String> {
    trace!("web: {label} focus");
    find(&app, &label)?.set_focus().map_err(fail)
}

#[tauri::command]
pub fn web_close(app: AppHandle, label: String) -> Result<(), String> {
    find(&app, &label)?.close().map_err(fail)?;
    info!("web: closed {label}");
    Ok(())
}

/// A reloaded frontend knows nothing about the old web panes.
pub fn close_all<R: Runtime>(app: &AppHandle<R>) {
    let mut closed = 0;
    for (label, webview) in app.webviews() {
        if label.starts_with(PREFIX) {
            match webview.close() {
                Ok(()) => closed += 1,
                Err(e) => warn!("web: close {label} failed: {e}"),
            }
        }
    }
    if closed > 0 {
        info!("web: app page reloaded, closed {closed} web pane(s)");
    }
}
