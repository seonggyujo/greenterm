//! Makes each shell report its current folder with the invisible
//! `ESC ] 9 ; 9 ; <path> ESC \` sequence (the one Windows Terminal uses),
//! emitted right before every prompt. Nothing visible changes and no user
//! profile file is touched: the hook lives only in this shell session.

use std::env;

use portable_pty::CommandBuilder;

use super::shell::ShellKind;

/// Wraps whatever prompt function the profile defined. Written with
/// [Console]::Write so PSReadLine does not count it as prompt text.
const POWERSHELL_HOOK: &str = concat!(
    "$global:__gtPrompt = $function:prompt; ",
    "function global:prompt { ",
    "$l = $executionContext.SessionState.Path.CurrentLocation; ",
    "if ($l.Provider.Name -eq 'FileSystem') { ",
    "[Console]::Write(\"$([char]27)]9;9;$($l.ProviderPath)$([char]27)\\\") }; ",
    "& $global:__gtPrompt }",
);

/// Bash reports $PWD in MSYS form (/c/Users/...); the frontend converts it.
const BASH_HOOK: &str = r#"printf '\e]9;9;%s\e\\' "$PWD""#;

pub fn apply(shell: ShellKind, cmd: &mut CommandBuilder) {
    match shell {
        ShellKind::Pwsh | ShellKind::PowerShell => {
            cmd.args(["-NoExit", "-Command", POWERSHELL_HOOK]);
        }
        ShellKind::Cmd => {
            // cmd expands $e (ESC) and $P (current drive and path) in PROMPT.
            let user_prompt = env::var("PROMPT").unwrap_or_else(|_| "$P$G".into());
            cmd.env("PROMPT", format!("$e]9;9;$P$e\\{user_prompt}"));
        }
        ShellKind::GitBash => {
            let hook = match env::var("PROMPT_COMMAND") {
                Ok(user) if !user.is_empty() => format!("{BASH_HOOK}; {user}"),
                _ => BASH_HOOK.to_string(),
            };
            cmd.env("PROMPT_COMMAND", hook);
        }
    }
}
