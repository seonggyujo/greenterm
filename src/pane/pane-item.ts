import type { Fittable } from "../layout/fit-scheduler";

// What the pane manager, the layout and dragging need from a pane. Two
// kinds exist: a terminal (pane.ts) and a web page (web-pane.ts).

export interface PaneItem extends Fittable {
  readonly el: HTMLElement;
  /** The header, where a drag to move the pane starts. */
  readonly handle: HTMLElement;
  /** For logs, e.g. "pty 3" or "web-1". */
  readonly name: string;
  /** A terminal whose shell is alive. Web panes are never "running". */
  readonly running: boolean;
  setFontSize(px: number): void;
  setFocused(focused: boolean): void;
  focus(): void;
  /** Dropped file paths; only terminals use them. */
  paste(text: string): void;
  enter(): void;
  leave(): Promise<void>;
  dispose(): void;
}

/** What a pane reports back to the pane manager. */
export interface PaneCallbacks {
  onClose(pane: PaneItem): void;
  onFocus(pane: PaneItem): void;
}
