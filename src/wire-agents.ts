import { AgentBoard } from "./agent/agent-board";
import { markOf } from "./agent/agent-model";
import { folderName } from "./app/paths";
import type { UptimeClock } from "./app/uptime-clock";
import { onAgentUpdate } from "./ipc/agent";
import type { PaneManager } from "./pane/pane-manager";
import type { PaneSignal } from "./pane/pane-signals";
import { createAgentDock } from "./ui/agent-dock";

// Wiring only, like main.ts: plugin files and pane signals go into the
// agent board; every change of the board redraws the dock and the pane dots.

export interface AgentWiring {
  /** The dock, to place under the workspace. */
  dock: HTMLElement;
  onSignal(pty: number, signal: PaneSignal): void;
  /** Panes were added, closed or renamed: redraw. */
  refresh(): void;
  /** Starts listening to the plugin files. */
  start(): Promise<void>;
}

/** `panes` is read lazily: the pane manager is built after this. */
export function wireAgents(clock: UptimeClock, panes: () => PaneManager): AgentWiring {
  const board = new AgentBoard();
  // A chip click focuses that pane and counts as having seen it.
  const dock = createAgentDock(board, clock, (pty) => {
    panes().terminals().find((p) => p.id === pty)?.focus();
    board.seen(pty);
  });

  // The agent's own folder when the plugin reports it, else the shell's.
  const folderOf = (pty: number, fallback: string) => folderName(board.get(pty)?.cwd ?? "") ?? fallback;
  const refresh = () => {
    const terminals = panes().terminals();
    dock.render(
      terminals.flatMap((p, i) => (p.id === null ? [] : [{ pty: p.id, number: i + 1, folder: folderOf(p.id, p.folder) }])),
    );
    for (const p of terminals) {
      const agent = p.id === null ? undefined : board.get(p.id);
      p.setAgentMark(agent ? markOf(agent.state) : null);
    }
  };
  board.subscribe(refresh);

  return {
    dock: dock.el,
    refresh,
    onSignal(pty, signal) {
      switch (signal.kind) {
        case "title":
          return board.title(pty, signal.title);
        case "key":
          return board.input(pty);
        case "focus":
          return board.seen(pty);
        case "prompt":
        case "closed":
          return board.remove(pty);
      }
    },
    async start() {
      await onAgentUpdate((update) => board.update(update));
    },
  };
}
