import { createLogger } from "../app/log";
import type { UptimeClock } from "../app/uptime-clock";
import { onPtyExit, type ShellKind } from "../ipc/pty";
import type { Zone } from "../layout/drop-zone";
import { FitScheduler } from "../layout/fit-scheduler";
import { flip } from "../layout/flip";
import { SplitLayout } from "../layout/split-layout";
import { Pane } from "./pane";
import { attachPaneDrag, type DropHost } from "./pane-drag";

// Owns the list of panes: add, close, focus, font size. Where each pane
// sits is up to SplitLayout (auto grid, or the user's own splits); the
// ResizeObserver in FitScheduler then refits exactly the panes whose size
// changed.

const log = createLogger("panes");

export interface PaneCounts {
  total: number;
  running: number;
}

export class PaneManager {
  private panes: Pane[] = [];
  private focused: Pane | null = null;
  private readonly fits = new FitScheduler();
  private readonly layout: SplitLayout<Pane>;
  private readonly dropHost: DropHost;

  constructor(
    private readonly workspace: HTMLElement,
    private readonly clock: UptimeClock,
    private fontSize: number,
    private readonly onChange: (counts: PaneCounts) => void,
    /** True while the user's own arrangement replaces the auto grid. */
    onLayoutMode: (manual: boolean) => void,
  ) {
    this.layout = new SplitLayout(workspace, () => this.panes, onLayoutMode);
    this.dropHost = {
      workspace,
      paneAt: (x, y) => this.paneAt(x, y),
      drop: (source, target, zone) => this.move(source, target, zone),
    };
  }

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
    // pane takes its place.
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
      this.layout.add(pane, this.focused);
    });
    attachPaneDrag(pane, this.dropHost);
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

    // Play the exit animation, then free the space and let the rest glide
    // into place.
    void pane.leave().then(() => {
      flip(this.elements(), () => {
        pane.dispose();
        this.layout.remove(pane);
      });
    });
  }

  /** Puts the panes back into the automatic grid. */
  tidy(): void {
    flip(this.elements(), () => this.layout.tidy());
  }

  setFontSize(px: number): void {
    this.fontSize = px;
    this.panes.forEach((p) => p.setFontSize(px));
    // Cell size changed but the pane boxes did not, so no ResizeObserver
    // event will come: ask for a fit explicitly.
    this.fits.requestAll();
    log.debug(`font size ${px}px`);
  }

  /** The pane under a point in CSS pixels, if any. */
  paneAt(x: number, y: number): Pane | undefined {
    const el = document.elementFromPoint(x, y)?.closest(".pane");
    return this.panes.find((p) => p.el === el);
  }

  private move(source: Pane, target: Pane, zone: Zone): void {
    flip(this.elements(), () => this.layout.move(source, target, zone));
    source.focus();
  }

  private setFocus(pane: Pane): void {
    if (this.focused === pane) return;
    this.focused?.setFocused(false);
    this.focused = pane;
    pane.setFocused(true);
  }

  private elements(): HTMLElement[] {
    return this.panes.map((p) => p.el);
  }

  private notify(): void {
    this.onChange({
      total: this.panes.length,
      running: this.panes.filter((p) => p.running).length,
    });
  }
}
