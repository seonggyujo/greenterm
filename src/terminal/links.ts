import type { Terminal } from "@xterm/xterm";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { openUrl } from "@tauri-apps/plugin-opener";
import { createLogger } from "../app/log";

// Links in terminal output open in the default browser on Ctrl+click, like
// Windows Terminal (a plain click stays free for selecting text). Two
// sources:
//   - plain URLs in the text (web-links addon)
//   - OSC 8 hyperlinks emitted by programs (xterm linkHandler)
// Only http and https URLs are opened.
//
// When an app tracks the mouse (Claude Code, vim), xterm would also report
// the Ctrl+click to it, and an app that opens links itself opens a second
// tab (Claude Code even cuts the URL at the first non-ASCII character).
// So a Ctrl+click on a link is kept from the app and opened here only.

const log = createLogger("links");

function openLink(uri: string): void {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    log.warn(`not opening ${url.protocol} link`);
    return;
  }
  openUrl(url.href).catch((err) => log.warn("open link failed", err));
}

function activate(event: MouseEvent, uri: string): void {
  if (event.ctrlKey) openLink(uri);
}

/** Opens a Ctrl+clicked link without reporting the click to the app. */
function keepLinkClicksFromApp(term: Terminal, host: HTMLElement, hovered: () => string | null): void {
  let pressed: string | null = null;
  const grab = (e: MouseEvent): void => {
    const link = hovered();
    if (e.type === "mousedown") {
      pressed = null;
      if (e.button !== 0 || !e.ctrlKey || !link || term.modes.mouseTrackingMode === "none") return;
      pressed = link;
      term.focus();
    } else {
      if (pressed === null) return;
      if (e.button === 0 && link === pressed) openLink(link);
      pressed = null;
    }
    e.preventDefault();
    e.stopPropagation();
  };
  host.addEventListener("mousedown", grab, true);
  host.addEventListener("mouseup", grab, true);
}

export function attachLinks(term: Terminal, host: HTMLElement): void {
  let hovered: string | null = null;
  const hover = (_e: MouseEvent, uri: string): void => {
    hovered = uri;
  };
  const leave = (): void => {
    hovered = null;
  };
  term.loadAddon(new WebLinksAddon(activate, { hover, leave }));
  term.options.linkHandler = { activate, hover, leave, allowNonHttpProtocols: false };
  keepLinkClicksFromApp(term, host, () => hovered);
}
