//! Pseudo terminals. Each session runs four small threads:
//! writer (input), reader (blocking 64KB reads), batcher (merge + send to the
//! frontend), waiter (exit code and cleanup).

mod batcher;
mod ctrl_c;
mod cwd_report;
mod gate;
mod reader;
mod registry;
mod session;
mod shell;
mod waiter;
mod writer;

pub use ctrl_c::enable_for_shells as enable_ctrl_c;
pub use registry::PtyRegistry;
pub use shell::ShellKind;
