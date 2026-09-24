import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { createLogger } from "../app/log";
import { attachRightClick } from "./clipboard";
import { attachClipboardKeys } from "./keys";
import { attachLinks } from "./links";

// One xterm instance with fit + WebGL. The terminal itself is not styled:
// default xterm colors, only the Windows console font. No IPC here: the pane
// wires this to a PTY. Falls back to the DOM renderer when WebGL is
// unavailable or lost.

const log = createLogger("terminal");

const FONT = '"Cascadia Mono", Consolas, monospace';

interface Size {
  cols: number;
  rows: number;
}

export class TerminalView {
  readonly term: Terminal;
  private readonly fitAddon = new FitAddon();
  private size: Size = { cols: 0, rows: 0 };

  constructor(host: HTMLElement, fontSize: number) {
    this.term = new Terminal({
      fontFamily: FONT,
      fontSize,
      // Bounded history keeps memory flat under heavy output.
      scrollback: 5000,
      // Lets xterm reflow the way ConPTY expects on resize.
      windowsPty: { backend: "conpty" },
    });
    this.term.loadAddon(this.fitAddon);
    this.term.open(host);
    this.loadWebgl();
    attachClipboardKeys(this.term);
    attachRightClick(this.term, host);
    attachLinks(this.term);
  }

  private loadWebgl(): void {
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => {
        log.warn("WebGL context lost, falling back to DOM renderer");
        webgl.dispose();
      });
      this.term.loadAddon(webgl);
      log.debug("WebGL renderer active");
    } catch (err) {
      log.warn("WebGL unavailable, using DOM renderer", err);
    }
  }

  /** Fits to the host. Returns the new size only if cols/rows changed. */
  fit(): Size | null {
    const dims = this.fitAddon.proposeDimensions();
    if (!dims || !Number.isFinite(dims.cols) || !Number.isFinite(dims.rows)) return null;
    const cols = Math.max(2, dims.cols);
    const rows = Math.max(1, dims.rows);
    if (cols === this.size.cols && rows === this.size.rows) return null;
    this.size = { cols, rows };
    this.term.resize(cols, rows);
    return this.size;
  }

  /** Caller must fit() afterwards: cell size changed, host size did not. */
  setFontSize(px: number): void {
    this.term.options.fontSize = px;
  }

  write(data: Uint8Array, done?: () => void): void {
    this.term.write(data, done);
  }

  focus(): void {
    this.term.focus();
  }

  dispose(): void {
    this.term.dispose();
  }
}
