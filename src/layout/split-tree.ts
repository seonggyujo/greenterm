import { gridRows } from "./grid";

// Split tree, no DOM. A leaf holds one item (a pane). A split lays out its
// children side by side ("row") or stacked ("column"); each child takes its
// share of `sizes` (fractions that sum to 1). Operations change nodes in
// place and return the root, which may be a different node afterwards.

export type Axis = "row" | "column";
export type Side = "left" | "right" | "top" | "bottom";

export interface Leaf<T> {
  kind: "leaf";
  item: T;
}

export interface Split<T> {
  kind: "split";
  axis: Axis;
  children: Node<T>[];
  sizes: number[];
}

export type Node<T> = Leaf<T> | Split<T>;

interface Found<T, N extends Node<T>> {
  node: N;
  /** null when `node` is the root. */
  parent: Split<T> | null;
  index: number;
}

const leaf = <T>(item: T): Leaf<T> => ({ kind: "leaf", item });

function group<T>(axis: Axis, children: Node<T>[]): Node<T> {
  if (children.length === 1) return children[0];
  return { kind: "split", axis, children, sizes: children.map(() => 1 / children.length) };
}

function locate<T>(node: Node<T>, match: (n: Node<T>) => boolean, parent: Split<T> | null = null, index = 0): Found<T, Node<T>> | null {
  if (match(node)) return { node, parent, index };
  if (node.kind === "leaf") return null;
  for (let i = 0; i < node.children.length; i++) {
    const hit = locate(node.children[i], match, node, i);
    if (hit) return hit;
  }
  return null;
}

function find<T>(root: Node<T>, item: T): Found<T, Leaf<T>> | null {
  return locate(root, (n) => n.kind === "leaf" && n.item === item) as Found<T, Leaf<T>> | null;
}

/** Items in reading order. */
export function leaves<T>(root: Node<T> | null): T[] {
  if (!root) return [];
  return root.kind === "leaf" ? [root.item] : root.children.flatMap((c) => leaves(c));
}

/** The automatic grid (grid.ts) as a tree: a column of rows. */
export function autoTree<T>(items: T[]): Node<T> | null {
  if (items.length === 0) return null;
  let start = 0;
  const rows = gridRows(items.length).map((count) => {
    const row = items.slice(start, start + count).map((item) => leaf(item));
    start += count;
    return group("row", row);
  });
  return group("column", rows);
}

/** Puts `item` on `side` of `target`; the two share the target's space. */
export function insertAt<T>(root: Node<T>, item: T, target: T, side: Side): Node<T> {
  const at = find(root, target);
  if (!at) return root;
  const axis: Axis = side === "left" || side === "right" ? "row" : "column";
  const before = side === "left" || side === "top";
  const { node, parent, index } = at;

  // Same direction as the parent: join it as a sibling, no extra nesting.
  if (parent && parent.axis === axis) {
    const half = parent.sizes[index] / 2;
    parent.sizes.splice(index, 1, half, half);
    parent.children.splice(before ? index : index + 1, 0, leaf(item));
    return root;
  }
  const pair = before ? [leaf(item), node] : [node, leaf(item)];
  const split: Split<T> = { kind: "split", axis, children: pair, sizes: [0.5, 0.5] };
  if (!parent) return split;
  parent.children[index] = split;
  return root;
}

/** Replaces `old` with `next`, merging `next` into a parent of the same axis. */
function replace<T>(root: Node<T>, old: Node<T>, next: Node<T>): Node<T> {
  const at = locate(root, (n) => n === old);
  if (!at?.parent) return next;
  const { parent, index } = at;
  if (next.kind === "split" && next.axis === parent.axis) {
    const share = parent.sizes[index];
    parent.children.splice(index, 1, ...next.children);
    parent.sizes.splice(index, 1, ...next.sizes.map((s) => s * share));
  } else {
    parent.children[index] = next;
  }
  return root;
}

/** Takes `item` out; its siblings grow to fill the space. */
export function removeItem<T>(root: Node<T>, item: T): Node<T> | null {
  const at = find(root, item);
  if (!at) return root;
  const { parent, index } = at;
  if (!parent) return null;

  parent.children.splice(index, 1);
  const [freed] = parent.sizes.splice(index, 1);
  const rest = 1 - freed;
  parent.sizes = parent.sizes.map((s) => (rest > 0 ? s / rest : 1 / parent.sizes.length));
  // A split left with one child is replaced by that child.
  return parent.children.length === 1 ? replace(root, parent, parent.children[0]) : root;
}

/** Moves `item` next to `target`, on `side`. */
export function moveItem<T>(root: Node<T>, item: T, target: T, side: Side): Node<T> {
  if (item === target || !find(root, item) || !find(root, target)) return root;
  const rest = removeItem(root, item);
  return rest ? insertAt(rest, item, target, side) : root;
}

/** Swaps the places of two items. */
export function swapItems<T>(root: Node<T>, a: T, b: T): Node<T> {
  const x = find(root, a);
  const y = find(root, b);
  if (x && y) {
    x.node.item = b;
    y.node.item = a;
  }
  return root;
}

/** Short shape for logs, e.g. `column(row(1 2) 3)`. */
export function describe<T>(root: Node<T> | null, label: (item: T) => string): string {
  if (!root) return "empty";
  if (root.kind === "leaf") return label(root.item);
  return `${root.axis}(${root.children.map((c) => describe(c, label)).join(" ")})`;
}
