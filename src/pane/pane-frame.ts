import type { UptimeClock } from "../app/uptime-clock";
import { createPaneHeader, type PaneHeader } from "./pane-header";

// The DOM of one pane: a section with the header on top and the box the
// terminal draws into. A press on the header focuses the pane without
// starting a text selection.

export interface PaneFrame {
  el: HTMLElement;
  header: PaneHeader;
  /** Where the terminal view goes. */
  host: HTMLElement;
}

export function createPaneFrame(
  parent: HTMLElement,
  label: string,
  clock: UptimeClock,
  onClose: () => void,
  onHeaderPress: () => void,
): PaneFrame {
  const el = document.createElement("section");
  el.className = "pane";
  const header = createPaneHeader(label, clock, onClose);
  const body = document.createElement("div");
  body.className = "pane-body";
  const host = document.createElement("div");
  host.className = "pane-term";
  body.append(host);
  el.append(header.el, body);
  parent.append(el);
  header.el.addEventListener("mousedown", (e) => {
    e.preventDefault();
    onHeaderPress();
  });
  return { el, header, host };
}
