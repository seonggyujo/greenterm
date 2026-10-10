import { createLogger } from "../app/log";
import { folderName } from "../app/paths";
import { SHELL_LABELS } from "../app/shells";
import type { UptimeClock } from "../app/uptime-clock";
import type { ShellKind } from "../ipc/pty";
import { TerminalView } from "../terminal/terminal-view";
import { OutputGlow } from "./output-glow";
import { createPaneHeader, type PaneHeader } from "./pane-header";
import type { PaneItem } from "./pane-item";
import { animateEnter, animateLeave } from "./pane-motion";
import { watchPaneTerminal, type PaneSignal } from "./pane-signals";
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
  /** Title, prompt and key signals for the agent board. */
  onSignal(pane: Pane, signal: PaneSignal): void;
}

export class Pane implements PaneItem {
  readonly el: HTMLElement;
  readonly shell: ShellKind;
  private readonly cwd: string | null;
  private readonly header: PaneHeader;
  private readonly view: TerminalView;
  private readonly link: PtyLink;
  private readonly glow: OutputGlow;
  private exited = false;
  /** Folder the shell last reported. */
  private readonly where: () => string | null;

  constructor(parent: HTMLElement, opts: PaneOptions) {
    this.shell = opts.shell;
    this.cwd = opts.cwd;
    this.el = document.createElement("section");
    this.el.className = "pane";
    this.header = createPaneHeader(SHELL_LABELS[opts.shell], opts.clock, () => opts.onClose(this));
    const body = document.createElement("div");
    body.className = "pane-body";
    const host = document.createElement("div");
    host.className = "pane-term";
    body.append(host);
    this.el.append(this.header.el, body);
    parent.append(this.el);

    this.view = new TerminalView(host, opts.fontSize);
    this.glow = new OutputGlow(this.el);
    this.link = new PtyLink(this.view, () => this.glow.ping());

    this.where = watchPaneTerminal(this.view.term, () => this.name, this.header, (s) => opts.onSignal(this, s));
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
      this.header.startUptime();
    } catch (err) {
      log.error(`spawn ${this.shell} failed`, err);
      this.setExited(null);
    }
  }

  get id(): number | null {
    return this.link.id;
  }

  get name(): string {
    return `pty ${this.link.id}`;
  }

  get running(): boolean {
    return this.link.id !== null && !this.exited;
  }

  /** Last folder name, e.g. "greenterm"; the shell name until one is known. */
  get folder(): string {
    return folderName(this.where() ?? this.cwd ?? "") ?? SHELL_LABELS[this.shell];
  }


  /** The header, where a drag to move the pane starts (pane-drag.ts). */
  get handle(): HTMLElement {
    return this.header.el;
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
    this.glow.dispose();
    this.header.dispose();
    this.view.dispose();
    this.el.remove();
  }
}
