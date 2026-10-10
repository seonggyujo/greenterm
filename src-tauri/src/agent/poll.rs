//! Watches the agent files of live panes. Every POLL it compares the
//! modification time of two small files per pane; a changed file is read
//! and sent to the frontend. Writers replace files atomically (write, then
//! rename), so a read never sees half a file.

use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime};

use log::{debug, trace};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use super::files::{self, Kind, KINDS};

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
            let mut seen: HashMap<(u32, Kind), SystemTime> = HashMap::new();
            loop {
                thread::sleep(POLL);
                let live: Vec<u32> = panes.lock().unwrap().iter().copied().collect();
                seen.retain(|(pty, _), _| live.contains(pty));
                for pty in live {
                    for kind in KINDS {
                        check(&app, &dir, pty, kind, &mut seen);
                    }
                }
            }
        })
        .expect("spawn agent poll thread");
}

fn check(app: &AppHandle, dir: &std::path::Path, pty: u32, kind: Kind, seen: &mut HashMap<(u32, Kind), SystemTime>) {
    let file = files::path(dir, pty, kind);
    let Ok(modified) = std::fs::metadata(&file).and_then(|m| m.modified()) else { return };
    if seen.get(&(pty, kind)) == Some(&modified) {
        return;
    }
    seen.insert((pty, kind), modified);
    let data = match std::fs::read(&file).map(|b| serde_json::from_slice::<serde_json::Value>(&b)) {
        Ok(Ok(data)) => data,
        _ => {
            trace!("agent: pty {pty} {} unreadable, next round", kind.name());
            seen.remove(&(pty, kind));
            return;
        }
    };
    debug!("agent: pty {pty} {} changed", kind.name());
    let _ = app.emit("agent-update", AgentUpdate { pty, kind: kind.name(), data });
}
