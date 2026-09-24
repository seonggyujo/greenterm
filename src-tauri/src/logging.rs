//! Tiny stderr logger for `tauri dev`. Release builds compile every log call
//! out (`log` feature `release_max_level_off`), so this costs nothing there.
//!
//! Level: env `GREENTERM_LOG` = error | warn | info | debug | trace
//! (default debug). `trace` adds one line per output flush.

use std::sync::OnceLock;
use std::time::Instant;

use log::{Level, LevelFilter, Log, Metadata, Record};

const CRATE: &str = "greenterm_lib";

struct DevLogger {
    start: Instant,
}

impl Log for DevLogger {
    fn enabled(&self, meta: &Metadata) -> bool {
        // Only our own lines; tauri and wry internals are too noisy.
        meta.target().starts_with(CRATE) || meta.target() == "web"
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) {
            return;
        }
        let color = match record.level() {
            Level::Error => "31",
            Level::Warn => "33",
            Level::Info => "32",
            Level::Debug => "36",
            Level::Trace => "90",
        };
        // "greenterm_lib::pty::session" -> "pty::session", crate root -> "app".
        let target = match record.target().strip_prefix(CRATE) {
            Some("") => "app",
            Some(rest) => rest.trim_start_matches("::"),
            None => record.target(),
        };
        eprintln!(
            "\x1b[90m{:>8.3}s\x1b[0m \x1b[{color}m{:<5}\x1b[0m \x1b[90m{target:<14}\x1b[0m {}",
            self.start.elapsed().as_secs_f64(),
            record.level(),
            record.args()
        );
    }

    fn flush(&self) {}
}

pub fn init() {
    static LOGGER: OnceLock<DevLogger> = OnceLock::new();
    let logger = LOGGER.get_or_init(|| DevLogger { start: Instant::now() });

    let level = std::env::var("GREENTERM_LOG")
        .ok()
        .and_then(|v| v.parse::<LevelFilter>().ok())
        .unwrap_or(LevelFilter::Debug);

    if log::set_logger(logger).is_ok() {
        log::set_max_level(level);
    }
}
