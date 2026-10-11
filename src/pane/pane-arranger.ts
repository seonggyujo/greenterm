import type { Zone } from "../layout/drop-zone";
import { FitScheduler } from "../layout/fit-scheduler";
import { flip } from "../layout/flip";
import { SplitLayout } from "../layout/split-layout";
import { attachPaneDrag, type DropHost } from "./pane-drag";
import type { PaneItem } from "./pane-item";

// Where the panes sit and how they get there. SplitLayout places them (auto
// grid, or the user's own splits), a drag on a header moves one, flip()
// glides the others into their new boxes, and the ResizeObserver in
// FitScheduler refits exactly the panes whose size changed. The user's own
// arrangement can be saved and put back (wire-workspace.ts).

export class PaneArranger {
  private readonly fits = new FitScheduler();
  private readonly layout: SplitLayout<PaneItem>;
  private readonly dropHost: DropHost;

  /** `panes` are the live panes in the order they were opened. */
  constructor(
    workspace: HTMLElement,
    private readonly panes: () => PaneItem[],
    /** True while the user's own arrangement replaces the auto grid. */
    onLayoutMode: (manual: boolean) => void,
  ) {
    this.layout = new SplitLayout(workspace, panes, onLayoutMode);
    this.dropHost = {
      workspace,
      paneAt: (x, y) => this.paneAt(x, y),
      drop: (source, target, zone) => this.move(source, target, zone),
    };
  }

  /**
   * Places the pane that `create` makes (and adds to `panes`) next to
   * `near`. It is created inside flip(), so the old boxes are measured
   * before it takes its place.
   */
  place<T extends PaneItem>(create: () => T, near: PaneItem | null): T {
    let pane!: T;
    flip(this.elements(), () => {
      pane = create();
      this.layout.add(pane, near);
    });
    attachPaneDrag(pane, this.dropHost);
    pane.enter();
    this.fits.observe(pane.el, pane);
    return pane;
  }

  /**
   * For a pane already gone from `panes`: plays its exit animation, then
   * frees the space and lets the rest glide into place.
   */
  remove(pane: PaneItem): void {
    this.fits.unobserve(pane.el);
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

  /** The user's own arrangement, to save; null in the automatic grid. */
  shape(): unknown {
    return this.layout.shape();
  }

  /** Puts back a saved arrangement; false when it does not fit the panes. */
  restore(saved: unknown): boolean {
    return this.layout.restore(saved);
  }

  /**
   * After a font size change: the cell size changed but the pane boxes did
   * not, so no ResizeObserver event will come.
   */
  refitAll(): void {
    this.fits.requestAll();
  }

  /** The pane under a point in CSS pixels, if any. */
  paneAt(x: number, y: number): PaneItem | undefined {
    const el = document.elementFromPoint(x, y)?.closest(".pane");
    return this.panes().find((p) => p.el === el);
  }

  private move(source: PaneItem, target: PaneItem, zone: Zone): void {
    flip(this.elements(), () => this.layout.move(source, target, zone));
    source.focus();
  }

  private elements(): HTMLElement[] {
    return this.panes().map((p) => p.el);
  }
}
