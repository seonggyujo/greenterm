//! Tells the main webview when a web pane takes keyboard focus, e.g. from
//! a click into the page. The page is a separate native view, so the app
//! page never sees that click; WebView2's GotFocus event does.

use log::{debug, warn};
use tauri::{Emitter, Webview};
use webview2_com::FocusChangedEventHandler;

/// Payload: the label of the web pane that got focus.
const FOCUS_EVENT: &str = "web-focus";

pub fn watch(webview: &Webview) {
    let label = webview.label().to_string();
    let emitter = webview.clone();
    let watched = label.clone();
    let result = webview.with_webview(move |platform| {
        let controller = platform.controller();
        let handler = FocusChangedEventHandler::create(Box::new(move |_, _| {
            debug!("web: {watched} focused");
            if let Err(e) = emitter.emit_to("main", FOCUS_EVENT, watched.as_str()) {
                warn!("web: emit {FOCUS_EVENT} failed: {e}");
            }
            Ok(())
        }));
        let mut token = 0i64;
        // SAFETY: a plain COM call on the UI thread (with_webview runs there),
        // the same one Tauri makes to track window focus.
        if let Err(e) = unsafe { controller.add_GotFocus(&handler, &mut token) } {
            warn!("web: focus handler failed: {e}");
        }
    });
    if let Err(e) = result {
        warn!("web: watch focus of {label} failed: {e}");
    }
}
