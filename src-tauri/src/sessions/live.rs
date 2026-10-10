//! Sessions some Claude Code process runs right now, in any terminal: each
//! running process keeps `<config folder>/sessions/<pid>.json` with its
//! session id. A file whose process is gone (a crash) is not counted.
//! Opening or deleting a running session would fight that process.

use std::collections::HashSet;
use std::ffi::c_void;
use std::fs;
use std::path::Path;

use serde_json::Value;

const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
const STILL_ACTIVE: u32 = 259;

#[link(name = "kernel32")]
extern "system" {
    fn OpenProcess(access: u32, inherit: i32, pid: u32) -> *mut c_void;
    fn GetExitCodeProcess(process: *mut c_void, code: *mut u32) -> i32;
    fn CloseHandle(handle: *mut c_void) -> i32;
}

pub fn running_ids(config: &Path) -> HashSet<String> {
    let Ok(entries) = fs::read_dir(config.join("sessions")) else { return HashSet::new() };
    entries
        .flatten()
        .filter(|entry| entry.path().extension().is_some_and(|ext| ext == "json"))
        .filter_map(|entry| fs::read_to_string(entry.path()).ok())
        .filter_map(|text| serde_json::from_str::<Value>(&text).ok())
        .filter(|record| record["pid"].as_u64().and_then(|pid| u32::try_from(pid).ok()).is_some_and(alive))
        .filter_map(|record| record["sessionId"].as_str().map(str::to_owned))
        .collect()
}

fn alive(pid: u32) -> bool {
    // SAFETY: plain Win32 calls; the handle is closed before returning.
    unsafe {
        let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if process.is_null() {
            return false;
        }
        let mut code = 0;
        let ok = GetExitCodeProcess(process, &mut code) != 0;
        CloseHandle(process);
        ok && code == STILL_ACTIVE
    }
}
