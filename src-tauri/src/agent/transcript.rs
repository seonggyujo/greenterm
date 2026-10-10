//! Follows one Claude Code transcript while it grows: each read returns the
//! answers in the complete lines added since the last read. It starts at the
//! end of the file, and skips answers written before it started (a forked or
//! continued session begins with copies of older ones), because the model
//! selected for those is unknown.

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use super::answers::{answer_of, Answer};

/// More new bytes than this between two reads: start over at the end.
const MAX_NEW_BYTES: u64 = 16 * 1024 * 1024;

pub struct Transcript {
    path: PathBuf,
    offset: u64,
    /// When following began, in ms since the Unix epoch.
    since: u64,
    last_id: Option<String>,
}

impl Transcript {
    pub fn follow(path: PathBuf) -> Self {
        let offset = size(&path).unwrap_or(0);
        let since = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_millis() as u64);
        Self { path, offset, since, last_id: None }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    /// New answers, one per response, oldest first. A line still being
    /// written is left for the next read.
    pub fn read_new(&mut self) -> Vec<Answer> {
        let Some(size) = size(&self.path) else { return Vec::new() };
        if size < self.offset || size - self.offset > MAX_NEW_BYTES {
            self.offset = size;
            return Vec::new();
        }
        if size == self.offset {
            return Vec::new();
        }
        let Ok(bytes) = read_range(&self.path, self.offset, size) else { return Vec::new() };
        let Some(end) = bytes.iter().rposition(|&b| b == b'\n').map(|i| i + 1) else { return Vec::new() };
        self.offset += end as u64;
        let mut answers = Vec::new();
        for line in String::from_utf8_lossy(&bytes[..end]).lines() {
            let Some(answer) = answer_of(line) else { continue };
            if answer.id.is_some() && answer.id == self.last_id {
                continue;
            }
            self.last_id.clone_from(&answer.id);
            if answer.at.is_none_or(|at| at >= self.since) {
                answers.push(answer);
            }
        }
        answers
    }
}

fn size(path: &Path) -> Option<u64> {
    std::fs::metadata(path).ok().map(|m| m.len())
}

fn read_range(path: &Path, from: u64, to: u64) -> std::io::Result<Vec<u8>> {
    let mut file = File::open(path)?;
    file.seek(SeekFrom::Start(from))?;
    let mut bytes = Vec::with_capacity((to - from) as usize);
    file.take(to - from).read_to_end(&mut bytes)?;
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn answer(id: &str, model: &str, timestamp: &str) -> String {
        format!(r#"{{"type":"assistant","timestamp":"{timestamp}","message":{{"id":"{id}","model":"{model}"}}}}"#) + "\n"
    }

    fn append(path: &Path, text: &str) {
        std::fs::OpenOptions::new().create(true).append(true).open(path).unwrap().write_all(text.as_bytes()).unwrap();
    }

    #[test]
    fn reads_only_new_complete_answers_once_each() {
        let path = std::env::temp_dir().join(format!("heron-transcript-{}.jsonl", std::process::id()));
        let _ = std::fs::remove_file(&path);
        append(&path, &answer("old", "claude-sonnet-5-5", "2099-01-01T00:00:00Z"));
        let mut transcript = Transcript::follow(path.clone());
        assert!(transcript.read_new().is_empty(), "answers already there are not judged");

        let now = "2099-01-01T00:00:01Z";
        let split = answer("a", "claude-opus-5-5", now);
        append(&path, &(split.clone() + &split + &split[..10]));
        let found = transcript.read_new();
        assert_eq!(found.len(), 1, "lines of one answer count once");
        assert_eq!(found[0].model, "claude-opus-5-5");

        append(&path, &split[10..]);
        assert!(transcript.read_new().is_empty(), "the finished line was the same answer");

        // A copy of an older answer, as a forked session writes it.
        append(&path, &(answer("copy", "claude-sonnet-5-5", "2000-01-01T00:00:00Z") + &answer("b", "claude-haiku-5-5", now)));
        let found = transcript.read_new();
        assert_eq!(found.iter().map(|a| a.model.as_str()).collect::<Vec<_>>(), ["claude-haiku-5-5"]);
        std::fs::remove_file(&path).unwrap();
    }
}
