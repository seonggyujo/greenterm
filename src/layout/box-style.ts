import type { Box } from "./split-rects";

/** Positions an absolutely placed element inside the workspace. */
export function setBox(el: HTMLElement, { x, y, w, h }: Box): void {
  const s = el.style;
  s.left = `${x}px`;
  s.top = `${y}px`;
  s.width = `${w}px`;
  s.height = `${h}px`;
}
