import { createLogger } from "../app/log";
import type { UptimeClock } from "../app/uptime-clock";
import { onPtyExit, type ShellKind } from "../ipc/pty";
import { FitScheduler } from "../layout/fit-scheduler";
import { flip } from "../layout/flip";
import { computeGrid } from "../layout/grid";
import { Pane } from "./pane";

// Owns the list of panes: add, close, focus, font size, and the auto grid.
// Any change in pane count re-applies the grid; the ResizeObserver in
// FitScheduler then refits exactly the panes whose size changed.

const log = createLogger("panes");

export interface PaneCounts {
  total: number;
  running: number;
}

export class PaneManager {
  private panes: Pane[] = [];
  private focused: Pane | null = null;
  private readonly fits = new FitScheduler();

  constructor(
    private readonly workspace: HTMLElement,
    private readonly clock: UptimeClock,
    private fontSize: number,
    private readonly onChange: (counts: PaneCounts) => void,
  ) {}

  /** Subscribe to shell exits. Call once before adding panes. */
  async init(): Promise<void> {
    // Like Windows Terminal: a clean exit closes the pane, a failure keeps
    // it open so the output and exit code can be read.
    await onPtyExit(({ id, code }) => {
      const pane = this.panes.find((p) => p.id === id);
      if (!pane) return;
      pane.markExited(code);
      if (code === 0) this.close(pane);
      else this.notify();
    });
  }

  async add(shell: ShellKind, cwd: string | null = null): Promise<Pane> {
    // Create inside flip() so the old boxes are measured before the new
    // pane takes a grid cell.
    let pane!: Pane;
    flip(this.elements(), () => {
      pane = new Pane(this.workspace, {
        shell,
        cwd,
        fontSize: this.fontSize,
        clock: this.clock,
        onClose: (p) => this.close(p),
        onFocus: (p) => this.setFocus(p),
      });
      this.panes.push(pane);
      this.relayout();
    });
    pane.enter();
    this.fits.observe(pane.el, pane);
    pane.focus();
    log.info(`added ${shell}, ${this.panes.length} panes`);
    this.notify();

    await pane.start();
    this.notify();
    return pane;
  }

  close(pane: Pane): void {
    const index = this.panes.indexOf(pane);
    if (index < 0) return;
    this.panes.splice(index, 1);
    this.fits.unobserve(pane.el);
    if (this.focused === pane) this.focused = null;
    log.info(`closing pty ${pane.id}, ${this.panes.length} panes left`);

    const next = this.panes[Math.min(index, this.panes.length - 1)];
    next?.focus();
    this.notify();

    // Play the exit animation, then free the slot and let the rest glide
    // into the new grid.
    void pane.leave().then(() => {
      flip(this.elements(), () => {
        pane.dispose();
        this.relayout();
      });
    });
  }

  setFontSize(px: number): void {
    this.fontSize = px;
    this.panes.forEach((p) => p.setFontSize(px));
    // Cell size changed but the pane boxes did not, so no ResizeObserver
    // event will come: ask for a fit explicitly.
    this.fits.requestAll();
    log.debug(`font size ${px}px`);
  }

  private setFocus(pane: Pane): void {
    if (this.focused === pane) return;
    this.focused?.setFocused(false);
    this.focused = pane;
    pane.setFocused(true);
  }

  /** The pane under a point in CSS pixels, if any. */
  paneAt(x: number, y: number): Pane | undefined {
    const el = document.elementFromPoint(x, y)?.closest(".pane");
    return this.panes.find((p) => p.el === el);
  }

  private elements(): HTMLElement[] {
    return this.panes.map((p) => p.el);
  }

  private relayout(): void {
    const grid = computeGrid(this.panes.length);
    const style = this.workspace.style;
    style.gridTemplateColumns = `repeat(${grid.columns}, minmax(0, 1fr))`;
    style.gridTemplateRows = `repeat(${grid.rows}, minmax(0, 1fr))`;
    this.panes.forEach((p, i) => {
      p.el.style.gridColumn = `span ${grid.spans[i]}`;
    });
    log.debug(`grid ${grid.columns} tracks x ${grid.rows} rows, spans ${grid.spans.join(",")}`);
  }

  private notify(): void {
    this.onChange({
      total: this.panes.length,
      running: this.panes.filter((p) => p.running).length,
    });
  }
}
