import { invoke } from "@tauri-apps/api/core";

// Claude Code's sessions on this PC (src-tauri/src/sessions): the recent
// ones, newest first, which can be resumed, and deleting one. The recent
// list already leaves out running sessions and those whose folder is gone.

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

/** Of `ids`, the sessions `claude --resume` can open: saved, and not running elsewhere. */
export const resumableSessions = (ids: string[]) => invoke<string[]>("resumable_sessions", { ids });

/** Moves a session to the Recycle Bin. Rejects with "not-found", "running" or "io". */
export const deleteSession = (id: string) => invoke<void>("delete_session", { id });
