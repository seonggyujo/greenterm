import { createLogger } from "./app/log";
import { folderName } from "./app/paths";
import type { ShellKind } from "./ipc/pty";
import { deleteSession, recentSessions, type RecentSession } from "./ipc/sessions";
import type { PaneManager } from "./pane/pane-manager";
import { createNewAgentButton } from "./ui/new-agent-button";
import { createRecentSessions } from "./ui/recent-sessions";

// Wiring only, like main.ts: the agent sidebar's "New agent" button and its
// recent Claude Code sessions. Both open a pane with the default shell and
// type the command at its first prompt: `claude` in the selected pane's
// folder, `claude --resume <id>` in the folder the session last ran in. A
// session can also be moved to the Recycle Bin. The list is read again when
// the window gets focus and when an agent's session leaves its pane;
// sessions running in a pane are left out.

const log = createLogger("sessions");

/** Checked again here: the id is typed into a shell. */
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SessionWiring {
  /** The "New agent" button and the recent sessions, for the sidebar. */
  parts: { start: HTMLElement; sessions: HTMLElement };
  /** Ids of the sessions running in panes now. */
  setRunning(ids: string[]): void;
  /** The selected pane or its folder may have changed. */
  refreshFolder(): void;
  /** Reads the recent sessions now and whenever the window gets focus. */
  start(): void;
}

export function wireSessions(panes: () => PaneManager, shell: () => ShellKind): SessionWiring {
  let sessions: RecentSession[] = [];
  let running = new Set<string>();

  const open = (cwd: string | null, command: string) => {
    log.info(`open "${command}" in ${cwd ?? "home"}`);
    panes().add(shell(), cwd, command).catch((err) => log.error("open failed", err));
  };
  const button = createNewAgentButton(() => open(panes().selected()?.path ?? null, "claude"));
  const recent = createRecentSessions({
    open(session) {
      if (SESSION_ID.test(session.id)) open(session.cwd, `claude --resume ${session.id}`);
    },
    remove(session) {
      return deleteSession(session.id).then(
        () => {
          sessions = sessions.filter((s) => s.id !== session.id);
          draw();
          return null;
        },
        (err) => {
          log.warn(`deleting ${session.id} failed: ${err}`);
          return String(err);
        },
      );
    },
  });

  const draw = () => recent.render(sessions.filter((s) => !running.has(s.id)));
  const load = () => {
    recentSessions()
      .then((list) => {
        sessions = list;
        draw();
      })
      .catch((err) => log.warn("reading recent sessions failed", err));
  };

  return {
    parts: { start: button.el, sessions: recent.el },
    setRunning(ids) {
      const next = new Set(ids);
      const left = [...running].some((id) => !next.has(id));
      const changed = left || ids.some((id) => !running.has(id));
      running = next;
      // A session that left its pane was just written: read the list again.
      if (left) load();
      else if (changed) draw();
    },
    refreshFolder() {
      button.setFolder(folderName(panes().selected()?.path ?? "") ?? null);
    },
    start() {
      load();
      window.addEventListener("focus", load);
    },
  };
}
