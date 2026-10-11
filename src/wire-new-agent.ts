import { startFolders } from "./agent/start-folders";
import { startCommand } from "./app/claude-commands";
import { createLogger } from "./app/log";
import { folderName } from "./app/paths";
import { gitRepos, pickFolder } from "./ipc/folders";
import type { ShellKind } from "./ipc/pty";
import type { RecentSession } from "./ipc/sessions";
import type { PaneManager } from "./pane/pane-manager";
import { createAgentFolderMenu } from "./ui/agent-folder-menu";
import { createNewAgentButton } from "./ui/new-agent-button";

// Wiring only, like main.ts: "New agent" at the top of the agent sidebar.
// It opens a pane with the default shell and types `claude` at its first
// prompt, in the selected pane's folder. Its menu also offers the recent
// sessions' folders (agent/start-folders.ts), `claude --worktree` in those
// that are git repositories, and a folder picker.

const log = createLogger("new-agent");

export interface NewAgentWiring {
  /** The button, for the sidebar. */
  el: HTMLElement;
  /** The selected pane or its folder may have changed. */
  refreshFolder(): void;
}

export function wireNewAgent(
  panes: () => PaneManager,
  shell: () => ShellKind,
  recent: () => readonly RecentSession[],
): NewAgentWiring {
  const start = (cwd: string | null, worktree: boolean) => {
    const command = startCommand(worktree);
    log.info(`open "${command}" in ${cwd ?? "home"}`);
    panes().add(shell(), cwd, command).catch((err) => log.error("open failed", err));
  };
  const menu = createAgentFolderMenu({
    start,
    pick() {
      pickFolder().then(
        (dir) => dir && start(dir, false),
        (err) => log.warn("folder picker failed", err),
      );
    },
    repos: gitRepos,
  });
  document.body.append(menu.el);

  const selectedPath = () => panes().selected()?.path ?? null;
  const button = createNewAgentButton(
    () => start(selectedPath(), false),
    (anchor) => menu.toggle(anchor, startFolders(selectedPath(), recent())),
  );

  return {
    el: button.el,
    refreshFolder() {
      button.setFolder(folderName(selectedPath() ?? "") ?? null);
    },
  };
}
