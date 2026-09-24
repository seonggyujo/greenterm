import type { Terminal } from "@xterm/xterm";
import { createLogger } from "../app/log";

// Windows console clipboard behavior:
//   right-click  -> copy if text is selected, otherwise paste
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
    if (!copySelection(term)) void pasteClipboard(term);
  });
}
