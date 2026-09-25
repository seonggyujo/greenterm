//! How a web pane page behaves: which URLs it may load, where links that
//! want a new window go, and the reports sent to the main webview (URL and
//! title for the pane header).

use std::path::PathBuf;

use log::{debug, info, trace, warn};
use serde::Serialize;
use tauri::webview::{NewWindowResponse, PageLoadEvent, WebviewBuilder};
use tauri::{AppHandle, Emitter, Runtime, Url, Webview, WebviewUrl};
use tauri_plugin_opener::OpenerExt;

/// Tells the main webview what a web pane shows.
const PAGE_EVENT: &str = "web-page";

#[derive(Clone, Serialize)]
struct WebPage {
    label: String,
    url: String,
    title: Option<String>,
}

fn is_web(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https")
}

/// Only http and https pages are opened in web panes.
pub fn parse_url(url: &str) -> Result<Url, String> {
    let url = Url::parse(url).map_err(|e| e.to_string())?;
    if is_web(&url) {
        Ok(url)
    } else {
        Err(format!("{}: links are not opened in web panes", url.scheme()))
    }
}

fn report<R: Runtime>(webview: &Webview<R>, url: String, title: Option<String>) {
    let page = WebPage { label: webview.label().to_string(), url, title };
    if let Err(e) = webview.emit_to("main", PAGE_EVENT, page) {
        warn!("web: emit {PAGE_EVENT} failed: {e}");
    }
}

/// `data` is the web pane profile folder (profile.rs).
pub fn builder<R: Runtime>(label: &str, url: Url, data: PathBuf, app: AppHandle<R>) -> WebviewBuilder<R> {
    let (nav_label, window_label) = (label.to_string(), label.to_string());
    WebviewBuilder::new(label, WebviewUrl::External(url))
        .data_directory(data)
        .on_navigation(move |url| {
            let allowed = is_web(url);
            if allowed {
                debug!("web: {nav_label} navigating to {url}");
            } else {
                info!("web: {nav_label} blocked a {} link", url.scheme());
            }
            allowed
        })
        // Links that want a new window go to the default browser.
        .on_new_window(move |url, _| {
            if is_web(&url) {
                info!("web: {window_label} new window for {url}, opened in the browser");
                if let Err(e) = app.opener().open_url(url.as_str(), None::<&str>) {
                    warn!("web: open {url} in browser failed: {e}");
                }
            } else {
                info!("web: {window_label} blocked a new {} window", url.scheme());
            }
            NewWindowResponse::Deny
        })
        // Titles also change on in-page navigation (YouTube is a single
        // page app), so the URL is read again each time.
        .on_document_title_changed(|webview, title| {
            trace!("web: {} title {title:?}", webview.label());
            let url = webview.url().map(|u| u.to_string()).unwrap_or_default();
            report(&webview, url, Some(title));
        })
        .on_page_load(|webview, payload| {
            if payload.event() == PageLoadEvent::Finished {
                report(&webview, payload.url().to_string(), None);
            }
        })
}
