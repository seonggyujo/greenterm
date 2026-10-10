import { AgentBoard } from "./agent/agent-board";
import { markOf, wantsAttention } from "./agent/agent-model";
import { syncAgentHooks } from "./app/agent-hooks";
import { createLogger } from "./app/log";
import { folderName } from "./app/paths";
import type { UptimeClock } from "./app/uptime-clock";
import { onAgentUpdate } from "./ipc/agent";
import { flashTaskbar } from "./ipc/attention";
import type { PaneManager } from "./pane/pane-manager";
import { markAgent, markHover, type PaneSignal } from "./pane/pane-signals";
import type { AgentRow } from "./ui/agent-item";
import { createAgentSidebar } from "./ui/agent-sidebar";
import { createUsageBar } from "./ui/usage-bar";

// Wiring only, like main.ts: agent updates and pane signals go into the
// agent board; every change of the board redraws the sidebar, the usage bar
// and the pane dots, and an agent that needs the user or finishes flashes
// the taskbar button.

const log = createLogger("attention");

export interface AgentWiring {
  /** The sidebar, to place left of the workspace. */
  sidebar: HTMLElement;
  /** The usage bar, to place along the bottom of the window. */
  usageBar: HTMLElement;
  onSignal(pty: number, signal: PaneSignal): void;
  /** Panes were added, closed or renamed: redraw. */
  refresh(): void;
  /** Starts listening to the agent files and checks Heron's Claude Code hooks. */
  start(): Promise<void>;
}

/** `panes` is read lazily: the pane manager is built after this. */
export function wireAgents(clock: UptimeClock, panes: () => PaneManager): AgentWiring {
  const board = new AgentBoard();
  const byPty = (pty: number) => panes().terminals().find((p) => p.id === pty);
  // A click focuses that pane and counts as having seen it.
  const pick = (pty: number) => {
    byPty(pty)?.focus();
    board.seen(pty);
  };
  const sidebar = createAgentSidebar(clock, {
    onPick: pick,
    onHover(pty) {
      for (const p of panes().terminals()) markHover(p.el, p.id !== null && p.id === pty);
    },
  });
  const usageBar = createUsageBar(clock, pick);

  // The agent's own folder when the hooks report it, else the shell's.
  const folderOf = (pty: number, fallback: string) => folderName(board.get(pty)?.cwd ?? "") ?? fallback;
  const refresh = () => {
    const terminals = panes().terminals();
    const rows: AgentRow[] = terminals.flatMap((p, i) => {
      const agent = p.id === null ? undefined : board.get(p.id);
      return agent && p.id !== null ? [{ pty: p.id, number: i + 1, folder: folderOf(p.id, p.folder), agent }] : [];
    });
    sidebar.render(rows, board.limits !== null || rows.some((r) => r.agent.context !== null));
    usageBar.render(rows, board.limits);
    for (const p of terminals) {
      const agent = p.id === null ? undefined : board.get(p.id);
      markAgent(p.el, agent ? markOf(agent.state) : null);
    }
  };
  board.subscribe((change) => {
    refresh();
    if (!wantsAttention(change.from, change.to)) return;
    flashTaskbar().catch((err) => log.warn("taskbar flash failed", err));
  });

  return {
    sidebar: sidebar.el,
    usageBar: usageBar.el,
    refresh,
    onSignal(pty, signal) {
      switch (signal.kind) {
        case "title":
          return board.title(pty, signal.title);
        case "key":
          return board.input(pty, signal.interrupt);
        case "focus":
          return board.seen(pty);
        case "prompt":
        case "closed":
          return board.remove(pty);
      }
    },
    async start() {
      await onAgentUpdate((update) => board.update(update));
      // Not awaited: putting hooks back runs `claude --version`.
      void syncAgentHooks();
    },
  };
}
