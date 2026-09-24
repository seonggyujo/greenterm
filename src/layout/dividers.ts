import { createLogger } from "../app/log";
import { setBox } from "./box-style";
import type { Divider } from "./split-rects";

// Grab handles in the gaps between panes. Dragging one moves the boundary
// between its two neighbours, never making either smaller than MIN_PX; a
// double-click makes the two equal again. Elements are pooled and reused
// in order, so a handle stays the same element while it is dragged.

const log = createLogger("dividers");
const MIN_PX = 80;

export class Dividers<T> {
  private readonly pool: HTMLElement[] = [];
  private current: Divider<T>[] = [];

  /** `onResize` runs after the sizes of a split changed. */
  constructor(
    private readonly parent: HTMLElement,
    private readonly onResize: () => void,
  ) {}

  render(dividers: Divider<T>[]): void {
    this.current = dividers;
    while (this.pool.length < dividers.length) this.pool.push(this.create());
    this.pool.forEach((el, i) => {
      const d = dividers[i];
      el.hidden = !d;
      if (!d) return;
      el.classList.toggle("row", d.axis === "row");
      el.classList.toggle("column", d.axis === "column");
      setBox(el, d.box);
    });
  }

  private create(): HTMLElement {
    const el = document.createElement("div");
    el.className = "divider";
    el.addEventListener("pointerdown", (e) => this.drag(el, e));
    el.addEventListener("dblclick", () => this.equalize(el));
    this.parent.append(el);
    return el;
  }

  private at(el: HTMLElement): Divider<T> | undefined {
    return this.current[this.pool.indexOf(el)];
  }

  private drag(el: HTMLElement, down: PointerEvent): void {
    const d = this.at(el);
    if (!d || down.button !== 0 || d.span <= 0) return;
    down.preventDefault();
    el.setPointerCapture(down.pointerId);
    el.classList.add("active");
    document.body.classList.add(`resizing-${d.axis}`);

    const { split, index, span } = d;
    const pos = (e: PointerEvent) => (d.axis === "row" ? e.clientX : e.clientY);
    const origin = pos(down);
    const first = split.sizes[index];
    const pair = first + split.sizes[index + 1];
    const min = Math.min(MIN_PX / span, pair / 2);

    const move = (e: PointerEvent) => {
      const next = Math.min(pair - min, Math.max(min, first + (pos(e) - origin) / span));
      if (next === split.sizes[index]) return;
      split.sizes[index] = next;
      split.sizes[index + 1] = pair - next;
      this.onResize();
    };
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("lostpointercapture", end);
      el.classList.remove("active");
      document.body.classList.remove(`resizing-${d.axis}`);
      log.debug(`${d.axis} split ${index}|${index + 1} at ${split.sizes[index].toFixed(3)} of ${pair.toFixed(3)}`);
    };
    el.addEventListener("pointermove", move);
    // Fires after pointerup and pointercancel as well.
    el.addEventListener("lostpointercapture", end);
  }

  private equalize(el: HTMLElement): void {
    const d = this.at(el);
    if (!d) return;
    const { sizes } = d.split;
    const half = (sizes[d.index] + sizes[d.index + 1]) / 2;
    if (sizes[d.index] === half) return;
    sizes[d.index] = half;
    sizes[d.index + 1] = half;
    log.debug(`${d.axis} split ${d.index}|${d.index + 1} made equal`);
    this.onResize();
  }
}
