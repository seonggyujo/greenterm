// Where the saved work of the last run lives (workspace.ts reads it).
// localStorage like the preferences: a failure only means nothing reopens.
// Settings > Reset drops it too; the next save writes it again.

const KEY = "heron.workspace";

export function readWorkspace(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function writeWorkspace(json: string): void {
  try {
    localStorage.setItem(KEY, json);
  } catch {
    /* storage unavailable */
  }
}
