import type { Axis, Node, Split } from "./split-tree";

// Turns a split tree into pixel boxes, no DOM. Children of a split share
// its length minus the gaps between them. Edges are rounded so panes sit
// on whole pixels (sharp terminal text); a gap may then be 1px off.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The gap between child `index` and `index + 1` of `split`. */
export interface Divider<T> {
  split: Split<T>;
  index: number;
  axis: Axis;
  box: Box;
  /** Pixels the children of `split` share, gaps excluded. */
  span: number;
}

export interface Rects<T> {
  boxes: Map<T, Box>;
  dividers: Divider<T>[];
}

export function computeRects<T>(root: Node<T> | null, area: Box, gap: number): Rects<T> {
  const out: Rects<T> = { boxes: new Map(), dividers: [] };
  if (root) place(root, area, gap, out);
  return out;
}

function place<T>(node: Node<T>, box: Box, gap: number, out: Rects<T>): void {
  if (node.kind === "leaf") {
    out.boxes.set(node.item, box);
    return;
  }
  const row = node.axis === "row";
  const start = row ? box.x : box.y;
  const n = node.children.length;
  const span = Math.max(0, (row ? box.w : box.h) - gap * (n - 1));
  // Edge positions along the split axis, rounded once so neighbours agree.
  const edge = (acc: number, i: number) => Math.round(start + span * acc + gap * i);
  const cut = (from: number, to: number): Box =>
    row ? { ...box, x: from, w: to - from } : { ...box, y: from, h: to - from };

  let acc = 0;
  node.children.forEach((child, i) => {
    const from = edge(acc, i);
    acc += node.sizes[i];
    const to = edge(acc, i);
    place(child, cut(from, to), gap, out);
    if (i < n - 1) {
      out.dividers.push({ split: node, index: i, axis: node.axis, box: cut(to, edge(acc, i + 1)), span });
    }
  });
}
