import { createLogger } from "../app/log";
import { setBox } from "./box-style";
import { Dividers } from "./dividers";
import type { Zone } from "./drop-zone";
import { computeRects, type Box } from "./split-rects";
import { autoTree, describe, insertAt, leaves, moveItem, removeItem, swapItems, type Node } from "./split-tree";

// Places items (panes) in the workspace from a split tree.
// Automatic mode rebuilds the tree from the grid rules on every add and
// close. The first drag or divider move switches to manual mode: adding
// then splits the focused pane along its longer side, and closing lets the
// neighbours take the space. One item left, or tidy(), goes back to auto.
// Items stay direct children of the workspace and only get absolute boxes,
// so a terminal is never re-parented.

const log = createLogger("layout");

/** Gap between panes and around the edge of the workspace, in px. */
const GAP = 10;

export interface Placeable {
  readonly el: HTMLElement;
}

export class SplitLayout<T extends Placeable> {
  private root: Node<T> | null = null;
  private manual = false;
  private boxes = new Map<T, Box>();
  private readonly dividers: Dividers<T>;

  /** `items` are the live items in creation order (auto grid order). */
  constructor(
    private readonly workspace: HTMLElement,
    private readonly items: () => T[],
    private readonly onModeChange: (manual: boolean) => void,
  ) {
    this.dividers = new Dividers(workspace, () => {
      this.setManual(true);
      this.apply();
    });
    new ResizeObserver(() => this.apply()).observe(workspace);
  }

  /** Places a new item; in manual mode it takes half of `near`. */
  add(item: T, near: T | null): void {
    const placed = leaves(this.root);
    if (this.manual && this.root && placed.length > 0) {
      const target = near && placed.includes(near) ? near : placed[placed.length - 1];
      const box = this.boxes.get(target);
      const side = !box || box.w >= box.h ? "right" : "bottom";
      this.root = insertAt(this.root, item, target, side);
    } else {
      this.root = autoTree(this.items());
    }
    this.changed("add");
  }

  /** Frees the space of an item that is no longer in `items`. */
  remove(item: T): void {
    if (this.manual && this.root && this.items().length > 1) {
      this.root = removeItem(this.root, item);
    } else {
      this.setManual(false);
      this.root = autoTree(this.items());
    }
    this.changed("remove");
  }

  /** Drop of a dragged item on `target`: split on a side, or swap. */
  move(item: T, target: T, zone: Zone): void {
    const live = this.items();
    if (!this.root || item === target || !live.includes(item) || !live.includes(target)) return;
    this.root =
      zone === "center" ? swapItems(this.root, item, target) : moveItem(this.root, item, target, zone);
    this.setManual(true);
    this.changed(`move ${zone}`);
  }

  /** Back to the automatic grid. */
  tidy(): void {
    this.setManual(false);
    this.root = autoTree(this.items());
    this.changed("tidy");
  }

  private setManual(manual: boolean): void {
    if (manual === this.manual) return;
    this.manual = manual;
    log.info(manual ? "manual layout" : "automatic grid");
    this.onModeChange(manual);
  }

  private changed(what: string): void {
    const live = this.items();
    // Items are numbered in creation order; x marks one that is closing.
    const label = (item: T) => (live.includes(item) ? String(live.indexOf(item) + 1) : "x");
    log.debug(`${what}: ${describe(this.root, label)}`);
    this.apply();
  }

  private apply(): void {
    const width = this.workspace.clientWidth - 2 * GAP;
    const height = this.workspace.clientHeight - 2 * GAP;
    const area = { x: GAP, y: GAP, w: Math.max(0, width), h: Math.max(0, height) };
    const { boxes, dividers } = computeRects(this.root, area, GAP);
    this.boxes = boxes;
    boxes.forEach((box, item) => setBox(item.el, box));
    this.dividers.render(dividers);
  }
}
