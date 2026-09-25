//! Where web panes keep cookies, history and site data: a WebView2 profile
//! folder of their own, apart from the app page's profile (which holds the
//! settings in localStorage). Clearing web data therefore never touches
//! the settings.

use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;

use log::info;
use tauri::{AppHandle, Manager, Runtime};

use super::PREFIX;

/// `%LOCALAPPDATA%\com.greenterm.app\web-panes`.
pub fn dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|d| d.join("web-panes"))
        .map_err(|e| e.to_string())
}

/// Settings > Clear web data. With web panes open, WebView2 clears the
/// profile they share and the pages reload. With none open, the folder is
/// deleted; that fails while WebView2 still holds it, right after the last
/// web pane closed.
#[tauri::command]
pub fn web_clear_data(app: AppHandle) -> Result<(), String> {
    let open: Vec<_> = app
        .webviews()
        .into_iter()
        .filter(|(label, _)| label.starts_with(PREFIX))
        .map(|(_, webview)| webview)
        .collect();
    if let Some(first) = open.first() {
        first.clear_all_browsing_data().map_err(|e| e.to_string())?;
        for webview in &open {
            let _ = webview.reload();
        }
        info!("web: cleared web data, reloaded {} web pane(s)", open.len());
        return Ok(());
    }
    let dir = dir(&app)?;
    match fs::remove_dir_all(&dir) {
        Ok(()) => info!("web: cleared web data, deleted {}", dir.display()),
        Err(e) if e.kind() == ErrorKind::NotFound => info!("web: no web data to clear"),
        Err(e) => return Err(format!("web data is still in use, try again in a moment ({e})")),
    }
    Ok(())
}
