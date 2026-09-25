import type { Terminal } from "@xterm/xterm";
import { createLogger } from "../app/log";

// Windows console clipboard behavior:
//   right-click  -> copy if text is selected, otherwise paste
//                   (goes to the app instead when it tracks the mouse;
//                   Shift+right-click still copies or pastes)
//   Ctrl+C       -> copy if text is selected, otherwise ^C to the shell
//   Ctrl+V       -> paste (browser paste event, handled by xterm)

const log = createLogger("clipboard");

/** Copies the selection. Returns false when nothing is selected. */
export function copySelection(term: Terminal): boolean {
  if (!term.hasSelection()) return false;
  navigator.clipboard.writeText(term.getSelection()).catch((err) => log.warn("copy failed", err));
  term.clearSelection();
  return true;
}

async function pasteClipboard(term: Terminal): Promise<void> {
  try {
    const text = await navigator.clipboard.readText();
    // term.paste applies bracketed paste mode when the shell enabled it.
    if (text) term.paste(text);
  } catch (err) {
    log.warn("paste failed", err);
  }
}

export function attachRightClick(term: Terminal, host: HTMLElement): void {
  host.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // An app that turned on mouse tracking (vim, Claude Code) already got
    // this click from xterm and handles it itself; pasting here as well would
    // paste twice. Shift+right-click is never reported, so it stays ours.
    if (term.modes.mouseTrackingMode !== "none" && !e.shiftKey) {
      log.debug("right-click left to the app (mouse tracking on)");
      return;
    }
    if (!copySelection(term)) void pasteClipboard(term);
  });
}
