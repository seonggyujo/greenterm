import { createLogger } from "../app/log";
import { SHELL_LABELS } from "../app/shells";
import { formatUptime, type UptimeClock } from "../app/uptime-clock";
import type { ShellKind } from "../ipc/pty";
import type { Fittable } from "../layout/fit-scheduler";
import { watchCwd } from "../terminal/cwd";
import { TerminalView } from "../terminal/terminal-view";
import { OutputGlow } from "./output-glow";
import { createPaneHeader, type PaneHeader } from "./pane-header";
import { animateEnter, animateLeave } from "./pane-motion";
import { PtyLink } from "./pty-link";

// One pane = header + xterm view + PTY link. The constructor only builds
// DOM; start() spawns the shell once the pane is laid out in the grid, so
// the first PTY size is already right.

const log = createLogger("pane");

export interface PaneOptions {
  shell: ShellKind;
  /** Folder to start in; null = home. */
  cwd: string | null;
  fontSize: number;
  clock: UptimeClock;
  onClose(pane: Pane): void;
  onFocus(pane: Pane): void;
}

export class Pane implements Fittable {
  readonly el: HTMLElement;
  readonly shell: ShellKind;
  private readonly cwd: string | null;
  private readonly header: PaneHeader;
  private readonly view: TerminalView;
  private readonly link: PtyLink;
  private readonly glow: OutputGlow;
  private readonly clock: UptimeClock;
  private stopUptime: (() => void) | null = null;
  private exited = false;

  constructor(parent: HTMLElement, opts: PaneOptions) {
    this.shell = opts.shell;
    this.cwd = opts.cwd;
    this.clock = opts.clock;
    this.el = document.createElement("section");
    this.el.className = "pane";
    this.header = createPaneHeader(SHELL_LABELS[opts.shell], () => opts.onClose(this));
    const body = document.createElement("div");
    body.className = "pane-body";
    this.el.append(this.header.el, body);
    parent.append(this.el);

    this.view = new TerminalView(body, opts.fontSize);
    this.glow = new OutputGlow(this.el);
    this.link = new PtyLink(this.view, () => this.glow.ping());

    this.view.term.onTitleChange((title) => this.header.setTitle(title));
    watchCwd(this.view.term, (path) => this.header.setCwd(path));
    this.el.addEventListener("focusin", () => opts.onFocus(this));
    this.header.el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.focus();
    });
  }

  async start(): Promise<void> {
    const { cols, rows } = this.view.fit() ?? { cols: 80, rows: 24 };
    try {
      await this.link.spawn(this.shell, cols, rows, this.cwd);
      const startedAt = Date.now();
      this.stopUptime = this.clock.subscribe((now) =>
        this.header.setUptime(formatUptime(now - startedAt)),
      );
    } catch (err) {
      log.error(`spawn ${this.shell} failed`, err);
      this.setExited(null);
    }
  }

  get id(): number | null {
    return this.link.id;
  }

  get running(): boolean {
    return this.link.id !== null && !this.exited;
  }

  fit(): void {
    const size = this.view.fit();
    if (!size || this.exited) return;
    log.debug(`pty ${this.id} fit to ${size.cols}x${size.rows}`);
    this.link.resize(size.cols, size.rows);
  }

  setFontSize(px: number): void {
    this.view.setFontSize(px);
  }

  setFocused(focused: boolean): void {
    this.el.classList.toggle("focused", focused);
  }

  focus(): void {
    this.view.focus();
  }

  /** Types text into the shell as a paste (bracketed paste when enabled). */
  paste(text: string): void {
    this.view.term.paste(text);
    this.focus();
  }

  markExited(code: number): void {
    log.info(`pty ${this.id} exited with code ${code}`);
    this.setExited(code);
  }

  private setExited(code: number | null): void {
    this.exited = true;
    this.link.markClosed();
    this.stopUptime?.();
    this.stopUptime = null;
    this.el.classList.add("exited");
    this.header.showExit(code);
  }

  enter(): void {
    animateEnter(this.el);
  }

  leave(): Promise<void> {
    return animateLeave(this.el);
  }

  dispose(): void {
    this.link.kill();
    this.stopUptime?.();
    this.glow.dispose();
    this.view.dispose();
    this.el.remove();
  }
}
