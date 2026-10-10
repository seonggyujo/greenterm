import type { RecentSession } from "../ipc/sessions";

// Recent sessions grouped by the folder they last ran in (pure). The folder
// whose newest session is oldest comes first, so the newest is at the
// bottom, and the sessions inside a folder are in the same order. Windows
// folders differ only in case or a trailing backslash are one folder.

export interface SessionGroup {
  /** The folder as its newest session wrote it. */
  cwd: string;
  /** Oldest first. */
  sessions: RecentSession[];
  /** Last write of the newest session. */
  modified: number;
}

/** The key a folder is grouped and remembered by. */
export const folderKey = (cwd: string): string => cwd.replace(/[\\/]+$/, "").toLowerCase();

export function groupByFolder(sessions: readonly RecentSession[]): SessionGroup[] {
  const groups = new Map<string, SessionGroup>();
  for (const session of [...sessions].sort((a, b) => a.modified - b.modified)) {
    const key = folderKey(session.cwd);
    const group = groups.get(key);
    if (!group) groups.set(key, { cwd: session.cwd, sessions: [session], modified: session.modified });
    else {
      group.sessions.push(session);
      group.cwd = session.cwd;
      group.modified = session.modified;
    }
  }
  return [...groups.values()].sort((a, b) => a.modified - b.modified);
}
