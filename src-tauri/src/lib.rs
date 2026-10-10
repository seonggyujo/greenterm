mod agent;
mod attention;
mod claude_hooks;
mod commands;
mod launch;
mod logging;
mod pty;
mod window;

use tauri::webview::PageLoadEvent;
use tauri::{Manager, RunEvent};

/// heron.exe started by Claude Code as a hook, or by the uninstaller to
/// remove those hooks: does that and returns the exit code, before anything
/// of the app starts. None for a normal start.
pub fn run_cli() -> Option<i32> {
    match std::env::args().nth(1).as_deref() {
        Some(claude_hooks::HOOK_FLAG) => Some(claude_hooks::run_hook()),
        Some(claude_hooks::REMOVE_FLAG) => Some(i32::from(claude_hooks::remove().is_err())),
        _ => None,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logging::init();

    #[cfg_attr(debug_assertions, allow(unused_mut))]
    let mut builder = tauri::Builder::default();
    // One window per user: a second launch (e.g. "Open in Heron") hands
    // its folder to the running window. Off in dev builds so a dev run does
    // not attach to an installed Heron.
    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(launch::on_second_instance));
    }

    let app = builder
        // Opens http(s) links from terminal output in the default browser.
        .plugin(tauri_plugin_opener::init())
        .manage(pty::PtyRegistry::default())
        .manage(launch::LaunchDir::from_args())
        .setup(|app| {
            // Agents in the panes report to %LOCALAPPDATA%\io.github.seonggyujo.heron\agents.
            let link = agent::AgentLink::new(app.path().app_local_data_dir()?.join("agents"));
            link.start(app.handle().clone());
            app.manage(link);
            Ok(window::create_main(app)?)
        })
        // A reload (dev hot reload, crash recovery) starts a fresh frontend
        // that knows nothing about the old shells, so drop them all.
        .on_page_load(|webview, payload| {
            if webview.label() == "main" && payload.event() == PageLoadEvent::Started {
                webview.state::<pty::PtyRegistry>().kill_all();
                webview.state::<agent::AgentLink>().forget_all();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_shells,
            attention::flash_taskbar,
            launch::take_launch_dir,
            commands::spawn_pty,
            commands::write_pty,
            commands::resize_pty,
            commands::pause_pty,
            commands::resume_pty,
            commands::kill_pty,
            commands::frontend_log,
            commands::agent_hooks_presence,
            commands::install_agent_hooks,
            commands::remove_agent_hooks,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    log::info!("app: started");
    app.run(|app, event| {
        // No shell may outlive the app.
        if let RunEvent::Exit = event {
            app.state::<pty::PtyRegistry>().kill_all();
            app.state::<agent::AgentLink>().forget_all();
            log::info!("app: exit");
        }
    });
}
