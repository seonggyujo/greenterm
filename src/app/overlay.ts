// App UI that must show above web panes: the drag preview, menus. A web
// pane is a native webview stacked over the whole app page, so no z-index
// can put HTML on top of it. While any overlay is up, web panes hide their
// webview instead (web/web-view.ts).

import { createLogger } from "./log";

const log = createLogger("overlay");

const active = new Set<string>();
const listeners = new Set<(up: boolean) => void>();

export function setOverlay(name: string, up: boolean): void {
  const before = active.size > 0;
  if (up) active.add(name);
  else active.delete(name);
  const after = active.size > 0;
  if (before === after) return;
  log.debug(after ? `up (${[...active].join(", ")}): web panes hide` : "down: web panes show");
  listeners.forEach((fn) => fn(after));
}

export function overlayUp(): boolean {
  return active.size > 0;
}

/** Returns the unsubscribe function. */
export function onOverlay(fn: (up: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
