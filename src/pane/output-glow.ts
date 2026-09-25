import { motionEnabled } from "../app/motion";
import { isAppHidden } from "../app/visibility";

// Output activity on a pane, shown in two ways:
//   `output` - border flash, removed GLOW ms after the last accepted ping
//   `active` - status dot pulses, removed ACTIVE ms after the last ping
// A quiet shell therefore has no running animation, so an idle app draws
// no frames. The DOM is touched at most once per THROTTLE ms. Off with
// Settings > Animations.

const THROTTLE = 150;
const GLOW = 300;
const ACTIVE = 3000;

export class OutputGlow {
  private last = 0;
  private glowTimer = 0;
  private activeTimer = 0;

  constructor(private readonly el: HTMLElement) {}

  ping(): void {
    if (isAppHidden() || !motionEnabled()) return;
    const now = performance.now();
    if (now - this.last < THROTTLE) return;
    this.last = now;

    this.el.classList.add("output", "active");
    clearTimeout(this.glowTimer);
    clearTimeout(this.activeTimer);
    this.glowTimer = window.setTimeout(() => this.el.classList.remove("output"), GLOW);
    this.activeTimer = window.setTimeout(() => this.el.classList.remove("active"), ACTIVE);
  }

  dispose(): void {
    clearTimeout(this.glowTimer);
    clearTimeout(this.activeTimer);
  }
}
