import { createLogger } from "../app/log";
import type { UptimeClock } from "../app/uptime-clock";
import type { ShellKind } from "../ipc/pty";
import type { Zone } from "../layout/drop-zone";
import { FitScheduler } from "../layout/fit-scheduler";
import { flip } from "../layout/flip";
import { SplitLayout } from "../layout/split-layout";
import { Pane } from "./pane";
import { countPanes, type PaneCounts } from "./pane-counts";
import { attachPaneDrag, type DropHost } from "./pane-drag";
import type { PaneCallbacks, PaneItem } from "./pane-item";
import type { PaneSignal } from "./pane-signals";
import { watchShellExits } from "./shell-exits";

// Owns the list of terminal panes: add, close, focus, font size. Where
// each pane sits is up to SplitLayout (auto grid, or the user's own
// splits); the ResizeObserver in FitScheduler then refits exactly the
// panes whose size changed.

const log = createLogger("panes");

export class PaneManager {
  private panes: PaneItem[] = [];
  private focused: PaneItem | null = null;
  private readonly fits = new FitScheduler();
  private readonly layout: SplitLayout<PaneItem>;
  private readonly dropHost: DropHost;

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
    this.layout = new SplitLayout(workspace, () => this.panes, onLayoutMode);
    this.dropHost = {
      workspace,
      paneAt: (x, y) => this.paneAt(x, y),
      drop: (source, target, zone) => this.move(source, target, zone),
    };
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
    this.fits.unobserve(pane.el);
    if (this.focused === pane) this.focused = null;
    log.info(`closing ${pane.name}, ${this.panes.length} panes left`);
    if (pane instanceof Pane) this.signal(pane, { kind: "closed" });

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
    const el = document.elementFromPoint(x, y)?.closest(".pane");
    return this.panes.find((p) => p.el === el);
  }

  /** Creates the pane inside flip(), so the old boxes are measured before it takes its place. */
  private insert<T extends PaneItem>(create: (cb: PaneCallbacks) => T): T {
    const cb: PaneCallbacks = { onClose: (p) => this.close(p), onFocus: (p) => this.setFocus(p) };
    let pane!: T;
    flip(this.elements(), () => {
      pane = create(cb);
      this.panes.push(pane);
      this.layout.add(pane, this.focused);
    });
    attachPaneDrag(pane, this.dropHost);
    pane.enter();
    this.fits.observe(pane.el, pane);
    pane.focus();
    this.notify();
    return pane;
  }

  private move(source: PaneItem, target: PaneItem, zone: Zone): void {
    flip(this.elements(), () => this.layout.move(source, target, zone));
    source.focus();
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

  private elements(): HTMLElement[] {
    return this.panes.map((p) => p.el);
  }

  private notify(): void {
    this.onChange(countPanes(this.panes));
  }
}
