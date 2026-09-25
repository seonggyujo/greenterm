import type { WebBox } from "../ipc/web";

// Where an element sits in the app page, in CSS pixels, ignoring CSS
// transforms. offsetLeft/Top skip the FLIP and enter animations, so a
// native webview goes straight to where its pane ends up instead of
// following a half-finished animation.

export function layoutBox(el: HTMLElement): WebBox {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft + (n === el ? 0 : n.clientLeft);
    y += n.offsetTop + (n === el ? 0 : n.clientTop);
  }
  return { x, y, width: Math.max(1, el.offsetWidth), height: Math.max(1, el.offsetHeight) };
}
