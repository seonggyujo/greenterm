//! Lets the shells in the panes receive Ctrl+C. A process started in a new
//! process group (some shortcuts, scripts and launchers do that) begins with
//! Ctrl+C ignored, and every child inherits that, so ^C would do nothing in
//! any pane. Windows Terminal clears the flag the same way at startup
//! (src/cascadia/WindowsTerminal/main.cpp).

use std::ffi::c_void;

#[link(name = "kernel32")]
extern "system" {
    fn SetConsoleCtrlHandler(handler: *const c_void, add: i32) -> i32;
}

/// Call once at startup, before any shell starts.
pub fn enable_for_shells() {
    // SAFETY: a null handler with FALSE only clears the inherited "ignore
    // Ctrl+C" flag of this process.
    unsafe { SetConsoleCtrlHandler(std::ptr::null(), 0) };
}
