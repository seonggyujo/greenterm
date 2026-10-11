import { createLogger } from "../app/log";
import type { UptimeClock } from "../app/uptime-clock";
import type { ShellKind } from "../ipc/pty";
import { Pane } from "./pane";
import { PaneArranger } from "./pane-arranger";
import { countPanes, type PaneCounts } from "./pane-counts";
import type { PaneCallbacks, PaneItem } from "./pane-item";
import type { PaneSignal } from "./pane-signals";
import { watchShellExits } from "./shell-exits";

// Owns the list of terminal panes: add, close, focus, font size. Where
// each pane sits, and how it moves there, is up to PaneArranger.

const log = createLogger("panes");

export class PaneManager {
  private panes: PaneItem[] = [];
  private focused: PaneItem | null = null;
  private readonly arranger: PaneArranger;

  constructor(
    private readonly workspace: HTMLElement,
    private readonly clock: UptimeClock,
    private fontSize: number,
    private readonly onChange: (counts: PaneCounts) => void,
    /** True while the user's own arrangement replaces the auto grid. */
    onLayoutMode: (manual: boolean) => void,
    /** Signals of the terminal with pty id `pty`, for the agent board. */
    private readonly onSignal: (pty: number, signal: PaneSignal) => void,
  ) {
    this.arranger = new PaneArranger(workspace, () => this.panes, onLayoutMode);
  }

  /** Subscribe to shell exits (shell-exits.ts). Call once before adding panes. */
  async init(): Promise<void> {
    await watchShellExits({
      find: (pty) => this.terminals().find((p) => p.id === pty),
      close: (pane) => this.close(pane),
      changed: () => this.notify(),
    });
  }

  /** `run`: a command to type at the shell's first prompt. */
  async add(shell: ShellKind, cwd: string | null = null, run?: string): Promise<Pane> {
    const onSignal = (p: Pane, s: PaneSignal) => this.signal(p, s);
    const pane = this.insert(
      (cb) => new Pane(this.workspace, { shell, cwd, fontSize: this.fontSize, clock: this.clock, onSignal, run, ...cb }),
    );
    log.info(`added ${shell}, ${this.panes.length} panes`);
    await pane.start();
    this.notify();
    return pane;
  }

  close(pane: PaneItem): void {
    const index = this.panes.indexOf(pane);
    if (index < 0) return;
    this.panes.splice(index, 1);
    if (this.focused === pane) this.focused = null;
    log.info(`closing ${pane.name}, ${this.panes.length} panes left`);
    if (pane instanceof Pane) this.signal(pane, { kind: "closed" });

    const next = this.panes[Math.min(index, this.panes.length - 1)];
    next?.focus();
    this.notify();
    this.arranger.remove(pane);
  }

  /** Puts the panes back into the automatic grid. */
  tidy(): void {
    this.arranger.tidy();
  }

  /** The user's own arrangement in pane positions, to save; null in the automatic grid. */
  layoutShape(): unknown {
    return this.arranger.shape();
  }

  /** Puts back a saved arrangement of the panes; false when it does not fit them. */
  restoreLayout(saved: unknown): boolean {
    return this.arranger.restore(saved);
  }

  setFontSize(px: number): void {
    this.fontSize = px;
    this.panes.forEach((p) => p.setFontSize(px));
    this.arranger.refitAll();
    log.debug(`font size ${px}px`);
  }

  /** Terminal panes in the order they were opened. */
  terminals(): Pane[] {
    return this.panes.filter((p): p is Pane => p instanceof Pane);
  }

  /** The selected terminal pane, if any. */
  selected(): Pane | null {
    return this.focused instanceof Pane ? this.focused : null;
  }

  /** The pane under a point in CSS pixels, if any. */
  paneAt(x: number, y: number): PaneItem | undefined {
    return this.arranger.paneAt(x, y);
  }

  private insert<T extends PaneItem>(create: (cb: PaneCallbacks) => T): T {
    const cb: PaneCallbacks = { onClose: (p) => this.close(p), onFocus: (p) => this.setFocus(p) };
    const pane = this.arranger.place(() => {
      const created = create(cb);
      this.panes.push(created);
      return created;
    }, this.focused);
    pane.focus();
    this.notify();
    return pane;
  }

  private setFocus(pane: PaneItem): void {
    if (this.focused === pane) return;
    this.focused?.setFocused(false);
    this.focused = pane;
    pane.setFocused(true);
    if (pane instanceof Pane) this.signal(pane, { kind: "focus" });
  }

  private signal(pane: Pane, signal: PaneSignal): void {
    if (pane.id !== null) this.onSignal(pane.id, signal);
  }

  private notify(): void {
    this.onChange(countPanes(this.panes));
  }
}
