// Pure layout math, no DOM. The automatic grid for n panes:
//   cols = ceil(sqrt(n)), rows = ceil(n / cols)
// Rows fill in order. The last row may hold fewer panes; they stretch to
// fill the width.
//   n=3 -> [2, 1]     (two on top, one wide below)
//   n=5 -> [3, 2]     (three on top, two wide below)
// split-tree.ts turns this into a column of rows.

/** How many panes sit in each row, top to bottom. */
export function gridRows(count: number): number[] {
  if (count <= 0) return [];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const lastRow = count - cols * (rows - 1);
  return Array.from({ length: rows }, (_, i) => (i < rows - 1 ? cols : lastRow));
}
