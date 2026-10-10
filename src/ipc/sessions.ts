import { invoke } from "@tauri-apps/api/core";

// Claude Code's recent sessions on this PC (src-tauri/src/sessions), newest
// first, and deleting one. Running sessions and sessions whose folder is
// gone are already left out.

export interface RecentSession {
  /** A UUID; the backend lists no other name. */
  id: string;
  /** The folder the session last ran in. */
  cwd: string;
  title: string;
  /** Last write, in ms since 1970. */
  modified: number;
}

export const recentSessions = () => invoke<RecentSession[]>("recent_sessions");

/** Moves a session to the Recycle Bin. Rejects with "not-found", "running" or "io". */
export const deleteSession = (id: string) => invoke<void>("delete_session", { id });
