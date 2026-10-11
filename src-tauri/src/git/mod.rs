//! What git says about a folder, for the agent sidebar: whether it is in a
//! repository (a new agent can start in a worktree there) and how far the
//! repository's working tree is from HEAD. Runs the git on PATH without a
//! console window and without taking git's optional locks, so an agent's
//! own git commands never meet a lock of ours.

mod numstat;

use std::os::windows::process::CommandExt;
use std::path::Path;
use std::process::Command;

pub use numstat::Changes;

/// No console window flashes up while git runs.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;
/// git's empty tree: what a repository without commits is compared with.
const EMPTY_TREE: &str = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
/// New files bigger than this count without their lines.
const MAX_COUNTED_BYTES: u64 = 2 * 1024 * 1024;
/// Only this many new files have their lines counted.
const MAX_COUNTED_FILES: usize = 200;

/// The top folder of the working tree `dir` is in: the nearest folder,
/// `dir` or above, with a `.git` folder (a repository) or file (a worktree).
pub fn root(dir: &Path) -> Option<&Path> {
    dir.ancestors().find(|d| d.join(".git").exists())
}

/// Tracked changes since HEAD, staged or not, plus untracked files that are
/// not ignored. None outside a repository or when git fails.
pub fn changes(dir: &Path) -> Option<Changes> {
    let root = root(dir)?;
    let tracked = git(root, &["diff", "--numstat", "HEAD", "--"]).or_else(|| git(root, &["diff", "--numstat", EMPTY_TREE, "--"]))?;
    let mut changes = numstat::parse(&tracked);
    let untracked = git(root, &["ls-files", "--others", "--exclude-standard", "-z"])?;
    for (i, name) in untracked.split('\0').filter(|n| !n.is_empty()).enumerate() {
        let lines = if i < MAX_COUNTED_FILES { new_file_lines(&root.join(name)) } else { 0 };
        changes.add_new_file(lines);
    }
    Some(changes)
}

fn new_file_lines(file: &Path) -> u64 {
    let small = file.metadata().is_ok_and(|m| m.is_file() && m.len() <= MAX_COUNTED_BYTES);
    let bytes = if small { std::fs::read(file).ok() } else { None };
    bytes.and_then(|b| numstat::text_lines(&b)).unwrap_or(0)
}

/// git's output, or None when it cannot run or fails.
fn git(dir: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .env("GIT_OPTIONAL_LOCKS", "0")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    output.status.success().then(|| String::from_utf8_lossy(&output.stdout).into_owned())
}
