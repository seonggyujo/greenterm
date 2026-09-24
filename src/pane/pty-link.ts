import { createLogger } from "../app/log";
import {
  killPty,
  pausePty,
  resizePty,
  resumePty,
  spawnPty,
  writePty,
  type ShellKind,
} from "../ipc/pty";
import { FlowControl } from "../terminal/flow-control";
import type { TerminalView } from "../terminal/terminal-view";

// Connects one TerminalView to one backend PTY: output in (with flow
// control), keystrokes out, resize, kill.

const log = createLogger("pty-link");

export class PtyLink {
  private ptyId: number | null = null;
  private closed = false;
  /** Input typed (or auto-replies from xterm) before the PTY id is known. */
  private pending: string[] = [];
  private readonly flow = new FlowControl({
    pause: () => this.call((id) => pausePty(id)),
    resume: () => this.call((id) => resumePty(id)),
  });

  constructor(
    private readonly view: TerminalView,
    private readonly onOutput: () => void,
  ) {
    view.term.onData((data) => {
      if (this.ptyId === null) this.pending.push(data);
      else this.write(data);
    });
  }

  get id(): number | null {
    return this.ptyId;
  }

  /** Throws when the shell cannot be started. */
  async spawn(shell: ShellKind, cols: number, rows: number): Promise<void> {
    this.ptyId = await spawnPty(shell, cols, rows, (data) => {
      this.view.write(data, this.flow.track(data.length));
      this.onOutput();
    });
    log.info(`spawned ${shell} as pty ${this.ptyId} (${cols}x${rows})`);
    this.pending.forEach((d) => this.write(d));
    this.pending = [];
  }

  resize(cols: number, rows: number): void {
    if (this.closed) return;
    this.call((id) => resizePty(id, cols, rows));
  }

  /** The shell ended: stop sending input and resizes. */
  markClosed(): void {
    this.closed = true;
  }

  kill(): void {
    this.call((id) => killPty(id));
    this.closed = true;
  }

  private write(data: string): void {
    if (this.closed) return;
    this.call((id) => writePty(id, data));
  }

  private call(fn: (id: number) => Promise<void>): void {
    if (this.ptyId === null) return;
    const id = this.ptyId;
    fn(id).catch((err) => log.warn(`pty ${id} call failed`, err));
  }
}
