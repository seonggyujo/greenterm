import { Pane } from "./pane";
import type { PaneItem } from "./pane-item";

// Numbers for the title bar badge and the empty state.

export interface PaneCounts {
  /** Every pane, web pages included. */
  total: number;
  terminals: number;
  /** Terminals whose shell is alive. */
  running: number;
}

export function countPanes(panes: PaneItem[]): PaneCounts {
  const terminals = panes.filter((p) => p instanceof Pane);
  return {
    total: panes.length,
    terminals: terminals.length,
    running: terminals.filter((p) => p.running).length,
  };
}
