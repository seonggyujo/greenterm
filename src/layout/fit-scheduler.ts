// Batches resize work: any number of ResizeObserver callbacks cause at most
// one fit() per target, run in requestAnimationFrame. Fitting a terminal
// costs ~10-15ms, so a frame only spends FRAME_BUDGET ms on fits and leaves
// the rest for the next frame. Maximizing a window with six panes then
// never blocks the main thread for one long task.

import { createLogger } from "../app/log";

const log = createLogger("fit");

export interface Fittable {
  fit(): void;
}

const FRAME_BUDGET = 10;

export class FitScheduler {
  private readonly targets = new Map<Element, Fittable>();
  private readonly dirty = new Set<Fittable>();
  private frame = 0;
  private readonly observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const target = this.targets.get(entry.target);
      if (target) this.dirty.add(target);
    }
    this.schedule();
  });

  observe(el: Element, target: Fittable): void {
    this.targets.set(el, target);
    this.observer.observe(el);
  }

  unobserve(el: Element): void {
    const target = this.targets.get(el);
    if (target) this.dirty.delete(target);
    this.targets.delete(el);
    this.observer.unobserve(el);
  }

  /** Fit everything on the next frames, e.g. after the font size changed. */
  requestAll(): void {
    this.targets.forEach((t) => this.dirty.add(t));
    this.schedule();
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => this.flush());
  }

  private flush(): void {
    this.frame = 0;
    const start = performance.now();
    // Always fit at least one, then continue while the budget allows.
    for (const target of this.dirty) {
      this.dirty.delete(target);
      target.fit();
      if (performance.now() - start >= FRAME_BUDGET) break;
    }
    if (this.dirty.size === 0) return;
    log.debug(`frame budget used, ${this.dirty.size} fit(s) moved to the next frame`);
    this.schedule();
  }
}
