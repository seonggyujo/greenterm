// Pure layout math, no DOM. For n panes:
//   cols = ceil(sqrt(n)), rows = ceil(n / cols)
// The last row may hold fewer panes; they stretch to fill the width. To do
// that with integer spans the grid uses lcm(cols, lastRowCount) tracks.
//   n=3 -> 2 tracks: [1, 1, 2]           (two on top, one wide below)
//   n=5 -> 6 tracks: [2, 2, 2, 3, 3]     (three on top, two wide below)

export interface GridLayout {
  /** CSS grid column tracks. */
  columns: number;
  rows: number;
  /** grid-column span for each pane, in order. */
  spans: number[];
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

export function computeGrid(count: number): GridLayout {
  if (count <= 0) return { columns: 1, rows: 1, spans: [] };

  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const fullRowPanes = cols * (rows - 1);
  const lastRow = count - fullRowPanes;
  const columns = lcm(cols, lastRow);

  const spans = Array.from({ length: count }, (_, i) =>
    i < fullRowPanes ? columns / cols : columns / lastRow,
  );
  return { columns, rows, spans };
}
