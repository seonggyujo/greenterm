import type { PaneItem } from "./pane-item";

// Numbers for the title bar badge and the empty state.

export interface PaneCounts {
  terminals: number;
  /** Terminals whose shell is alive. */
  running: number;
}

export function countPanes(panes: PaneItem[]): PaneCounts {
  return {
    terminals: panes.length,
    running: panes.filter((p) => p.running).length,
  };
}
