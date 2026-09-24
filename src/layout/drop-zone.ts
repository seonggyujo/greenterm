import type { Box } from "./split-rects";
import type { Side } from "./split-tree";

// Where a dragged pane lands on another pane, no DOM. The outer quarter on
// each side splits the target on that side (corners go to the nearer
// edge); the middle swaps the two panes.

export type Zone = Side | "center";

const EDGE = 0.25;

export function zoneAt(box: Box, x: number, y: number): Zone {
  const fx = (x - box.x) / box.w;
  const fy = (y - box.y) / box.h;
  if (fx > EDGE && fx < 1 - EDGE && fy > EDGE && fy < 1 - EDGE) return "center";
  const dist: Record<Side, number> = { left: fx, right: 1 - fx, top: fy, bottom: 1 - fy };
  return (Object.keys(dist) as Side[]).reduce((a, b) => (dist[b] < dist[a] ? b : a));
}

/** The part of the target box the dragged pane would take. */
export function previewBox(box: Box, zone: Zone): Box {
  const { x, y, w, h } = box;
  switch (zone) {
    case "left":
      return { x, y, w: w / 2, h };
    case "right":
      return { x: x + w / 2, y, w: w / 2, h };
    case "top":
      return { x, y, w, h: h / 2 };
    case "bottom":
      return { x, y: y + h / 2, w, h: h / 2 };
    case "center":
      return box;
  }
}
