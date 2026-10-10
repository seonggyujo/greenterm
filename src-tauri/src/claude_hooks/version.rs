//! The version of the Claude Code on PATH (`claude --version`). Heron's
//! hooks use the `args` form of a command hook. Versions before it treat
//! the entry as a shell command without the flag, which would start the app
//! on every hook event, so hooks are only installed for newer versions.

use std::os::windows::process::CommandExt;
use std::process::Command;

use super::HookError;

const MINIMUM: (u32, u32, u32) = (2, 1, 139);
/// No console window flashes up while `claude` runs.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub fn check() -> Result<(), HookError> {
    // Through cmd: `claude` may be a .cmd shim (npm install).
    let output = Command::new("cmd")
        .args(["/D", "/C", "claude", "--version"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|_| HookError::ClaudeNotFound)?;
    let text = String::from_utf8_lossy(&output.stdout);
    let version = parse(&text).filter(|_| output.status.success()).ok_or(HookError::ClaudeNotFound)?;
    if version < MINIMUM {
        let (major, minor, patch) = version;
        return Err(HookError::ClaudeTooOld(format!("{major}.{minor}.{patch}")));
    }
    Ok(())
}

/// "2.1.296 (Claude Code)" is (2, 1, 296).
pub fn parse(text: &str) -> Option<(u32, u32, u32)> {
    let word = text.split_whitespace().next()?;
    let mut parts = word.split('.').map(|p| p.parse::<u32>().ok());
    Some((parts.next()??, parts.next()??, parts.next()??))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_version_line() {
        assert_eq!(parse("2.1.296 (Claude Code)\n"), Some((2, 1, 296)));
        assert_eq!(parse("'claude' is not recognized"), None);
        assert!(parse("2.1.100 (Claude Code)").unwrap() < MINIMUM);
    }
}
