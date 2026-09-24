mod commands;
mod logging;
mod pty;
mod window;

use tauri::webview::PageLoadEvent;
use tauri::{Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logging::init();

    let app = tauri::Builder::default()
        .manage(pty::PtyRegistry::default())
        .setup(|app| Ok(window::create_main(app)?))
        // A reload (dev hot reload, crash recovery) starts a fresh frontend
        // that knows nothing about the old shells, so drop them all.
        .on_page_load(|webview, payload| {
            if payload.event() == PageLoadEvent::Started {
                webview.state::<pty::PtyRegistry>().kill_all();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_shells,
            commands::spawn_pty,
            commands::write_pty,
            commands::resize_pty,
            commands::pause_pty,
            commands::resume_pty,
            commands::kill_pty,
            commands::frontend_log,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    log::info!("app: started");
    app.run(|app, event| {
        // No shell may outlive the app.
        if let RunEvent::Exit = event {
            app.state::<pty::PtyRegistry>().kill_all();
            log::info!("app: exit");
        }
    });
}
