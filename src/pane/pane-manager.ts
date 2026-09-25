import { createLogger } from "../app/log";
import { closeOnExitPref } from "../app/prefs";
import type { UptimeClock } from "../app/uptime-clock";
import { onPtyExit, type ShellKind } from "../ipc/pty";
import type { Zone } from "../layout/drop-zone";
import { FitScheduler } from "../layout/fit-scheduler";
import { flip } from "../layout/flip";
import { SplitLayout } from "../layout/split-layout";
import { Pane } from "./pane";
import { countPanes, type PaneCounts } from "./pane-counts";
import { attachPaneDrag, type DropHost } from "./pane-drag";
import type { PaneCallbacks, PaneItem } from "./pane-item";
import { WebPane } from "./web-pane";

// Owns the list of panes, terminals and web pages: add, close, focus, font
// size. Where each pane sits is up to SplitLayout (auto grid, or the user's
// own splits); the ResizeObserver in FitScheduler then refits exactly the
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
    // Like Windows Terminal: a clean exit closes the pane (unless turned
    // off in settings), a failure keeps it open so the output and exit
    // code can be read.
    await onPtyExit(({ id, code }) => {
      const pane = this.panes.find((p): p is Pane => p instanceof Pane && p.id === id);
      if (!pane) return;
      pane.markExited(code);
      if (code === 0 && closeOnExitPref.get()) this.close(pane);
      else this.notify();
    });
  }

  async add(shell: ShellKind, cwd: string | null = null): Promise<Pane> {
    const pane = this.insert(
      (cb) => new Pane(this.workspace, { shell, cwd, fontSize: this.fontSize, clock: this.clock, ...cb }),
    );
    log.info(`added ${shell}, ${this.panes.length} panes`);
    await pane.start();
    this.notify();
    return pane;
  }

  async addWeb(url: string): Promise<WebPane> {
    const pane = this.insert((cb) => new WebPane(this.workspace, { url, ...cb }));
    log.info(`added ${pane.name} (${url}), ${this.panes.length} panes`);
    await pane.start();
    return pane;
  }

  close(pane: PaneItem): void {
    const index = this.panes.indexOf(pane);
    if (index < 0) return;
    this.panes.splice(index, 1);
    this.fits.unobserve(pane.el);
    if (this.focused === pane) this.focused = null;
    log.info(`closing ${pane.name}, ${this.panes.length} panes left`);

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
  }

  private elements(): HTMLElement[] {
    return this.panes.map((p) => p.el);
  }

  private notify(): void {
    this.onChange(countPanes(this.panes));
  }
}
