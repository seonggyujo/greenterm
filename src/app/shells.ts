import type { ShellKind } from "../ipc/pty";

// Shell names and the remembered default for the + button.
// localStorage is a convenience only: any failure falls back.

export const SHELL_LABELS: Record<ShellKind, string> = {
  pwsh: "pwsh",
  powershell: "PowerShell",
  cmd: "cmd",
  gitbash: "Git Bash",
};

const KEY = "greenterm.defaultShell";

/** The saved default if still installed, else the first installed shell. */
export function loadDefaultShell(available: ShellKind[]): ShellKind {
  try {
    const saved = localStorage.getItem(KEY) as ShellKind | null;
    if (saved && available.includes(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return available[0] ?? "powershell";
}

export function saveDefaultShell(shell: ShellKind): void {
  try {
    localStorage.setItem(KEY, shell);
  } catch {
    /* storage unavailable */
  }
}
