//! Claude Code version numbers, as `claude --version` prints them
//! ("2.1.296 (Claude Code)") and as each transcript entry records them
//! ("2.1.296"). Pure.

pub type Version = (u32, u32, u32);

/// The leading "major.minor.patch", or None.
pub fn parse(text: &str) -> Option<Version> {
    let word = text.split_whitespace().next()?;
    let mut parts = word.split('.').map(|p| p.parse::<u32>().ok());
    Some((parts.next()??, parts.next()??, parts.next()??))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_version_lines() {
        assert_eq!(parse("2.1.296 (Claude Code)\n"), Some((2, 1, 296)));
        assert_eq!(parse("2.1.251"), Some((2, 1, 251)));
        assert_eq!(parse("'claude' is not recognized"), None);
        assert!(parse("2.1.100 (Claude Code)").unwrap() < (2, 1, 139));
    }
}
