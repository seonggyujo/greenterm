//! Counting changes (pure): the totals of `git diff --numstat` output, and
//! the lines of a new file's text.

use serde::Serialize;

/// How far a working tree is from HEAD.
#[derive(Debug, Default, PartialEq, Eq, Serialize)]
pub struct Changes {
    /// Lines added, new files included.
    pub added: u64,
    pub removed: u64,
    /// Files changed, added or removed.
    pub files: u64,
}

impl Changes {
    /// An untracked file with `lines` lines (0 when not counted).
    pub fn add_new_file(&mut self, lines: u64) {
        self.added += lines;
        self.files += 1;
    }
}

/// `<added>\t<removed>\t<path>` per file; a binary file shows `-` for both.
pub fn parse(numstat: &str) -> Changes {
    let mut changes = Changes::default();
    for line in numstat.lines() {
        let mut fields = line.splitn(3, '\t');
        let (Some(added), Some(removed), Some(_path)) = (fields.next(), fields.next(), fields.next()) else { continue };
        changes.added += added.parse::<u64>().unwrap_or(0);
        changes.removed += removed.parse::<u64>().unwrap_or(0);
        changes.files += 1;
    }
    changes
}

/// Lines of a text file's bytes; None for binary data (a NUL byte), so it
/// counts as a file without lines.
pub fn text_lines(bytes: &[u8]) -> Option<u64> {
    if bytes.contains(&0) {
        return None;
    }
    let breaks = bytes.iter().filter(|&&b| b == b'\n').count() as u64;
    let unfinished = bytes.last().is_some_and(|&b| b != b'\n');
    Some(breaks + u64::from(unfinished))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sums_text_and_binary_files() {
        let out = "12\t3\tsrc/a.ts\n0\t7\tdocs/b.md\n-\t-\ticon.png\n";
        assert_eq!(parse(out), Changes { added: 12, removed: 10, files: 3 });
        assert_eq!(parse(""), Changes::default());
    }

    #[test]
    fn counts_lines_of_new_text_files() {
        assert_eq!(text_lines(b"a\nb\n"), Some(2));
        assert_eq!(text_lines(b"a\nb"), Some(2));
        assert_eq!(text_lines(b""), Some(0));
        assert_eq!(text_lines(b"PNG\0\x01"), None);
    }
}
