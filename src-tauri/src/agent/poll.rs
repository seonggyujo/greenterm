//! Watches the live panes: every POLL each pane's watch (watch.rs) checks its
//! few small files and its transcript, and what changed goes to the frontend
//! as an `agent-update` event.

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use log::debug;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use super::watch::PaneWatch;

const POLL: Duration = Duration::from_millis(700);

#[derive(Serialize, Clone)]
struct AgentUpdate {
    pty: u32,
    kind: &'static str,
    data: serde_json::Value,
}

pub fn spawn(app: AppHandle, dir: PathBuf, panes: Arc<Mutex<HashSet<u32>>>) {
    thread::Builder::new()
        .name("agent-poll".into())
        .spawn(move || {
            let mut watches: HashMap<u32, PaneWatch> = HashMap::new();
            loop {
                thread::sleep(POLL);
                let live: Vec<u32> = panes.lock().unwrap().iter().copied().collect();
                watches.retain(|pty, _| live.contains(pty));
                for pty in live {
                    let watch = watches.entry(pty).or_insert_with(PaneWatch::new);
                    for update in watch.poll(&dir, pty) {
                        debug!("agent: pty {pty} {} changed", update.kind);
                        let _ = app.emit("agent-update", AgentUpdate { pty, kind: update.kind, data: update.data });
                    }
                }
            }
        })
        .expect("spawn agent poll thread");
}
