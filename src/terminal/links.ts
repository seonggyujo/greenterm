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

const log = createLogger("links");

function open(event: MouseEvent, uri: string): void {
  if (!event.ctrlKey) return;
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

export function attachLinks(term: Terminal): void {
  term.loadAddon(new WebLinksAddon(open));
  term.options.linkHandler = { activate: open, allowNonHttpProtocols: false };
}
