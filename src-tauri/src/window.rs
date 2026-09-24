//! Main window. It is declared in tauri.conf.json with `"create": false`
//! and built here, because some webview options cannot be set from the
//! config file.

use tauri::{App, WebviewWindowBuilder};

pub fn create_main(app: &App) -> tauri::Result<()> {
    let config = app
        .config()
        .app
        .windows
        .first()
        .expect("tauri.conf.json must declare the main window")
        .clone();

    WebviewWindowBuilder::from_config(app.handle(), &config)?
        // Grants clipboard-read without a permission prompt, so right-click
        // paste works like in a console window.
        .enable_clipboard_access()
        .build()?;
    Ok(())
}
