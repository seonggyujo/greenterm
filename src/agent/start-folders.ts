import { inWorktree } from "../app/paths";
import type { RecentSession } from "../ipc/sessions";
import { folderKey } from "./session-groups";

// The folders the "New agent" menu offers (pure): the selected pane's
// folder first, then the folders of the recent sessions, newest first, each
// once. Worktrees Claude Code made are left out: a new agent starts in the
// repository, and its own worktree comes from `--worktree`.

const MAX_FOLDERS = 8;

export function startFolders(selected: string | null, sessions: readonly RecentSession[]): string[] {
  const newestFirst = [...sessions].sort((a, b) => b.modified - a.modified).map((s) => s.cwd);
  const seen = new Set<string>();
  const folders: string[] = [];
  for (const folder of [...(selected ? [selected] : []), ...newestFirst]) {
    const key = folderKey(folder);
    if (seen.has(key) || inWorktree(folder)) continue;
    seen.add(key);
    folders.push(folder);
  }
  return folders.slice(0, MAX_FOLDERS);
}
