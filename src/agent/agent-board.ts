import { createLogger } from "../app/log";
import type { AgentUpdate } from "../ipc/agent";
import {
  applyInput,
  applySeen,
  applyState,
  applyStatus,
  applyTitle,
  limitsOf,
  type Agent,
  type Limits,
} from "./agent-model";

// The agents of all panes, keyed by pty id, and the newest usage limits.
// Every signal goes through the pure functions in agent-model.ts; listeners
// hear about any change.

const log = createLogger("agents");

export class AgentBoard {
  private readonly agents = new Map<number, Agent>();
  private latestLimits: Limits | null = null;
  private readonly listeners = new Set<() => void>();

  get limits(): Limits | null {
    return this.latestLimits;
  }

  get(pty: number): Agent | undefined {
    return this.agents.get(pty);
  }

  /** A file the plugin wrote for a pane. */
  update({ pty, kind, data }: AgentUpdate): void {
    const now = Date.now();
    if (kind === "status") {
      const limits = limitsOf(data);
      if (limits && (!this.latestLimits || limits.at >= this.latestLimits.at)) this.latestLimits = limits;
      this.set(pty, applyStatus(this.agents.get(pty), data, now));
    } else {
      this.set(pty, applyState(this.agents.get(pty), data, now));
    }
  }

  title(pty: number, title: string): void {
    this.set(pty, applyTitle(this.agents.get(pty), title, Date.now()));
  }

  input(pty: number): void {
    const a = this.agents.get(pty);
    if (a) this.set(pty, applyInput(a, Date.now()));
  }

  seen(pty: number): void {
    const a = this.agents.get(pty);
    if (a) this.set(pty, applySeen(a, Date.now()));
  }

  /** The shell drew its prompt again, or the pane closed: no agent there now. */
  remove(pty: number): void {
    this.set(pty, null);
  }

  /** Returns the unsubscribe function. */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(pty: number, next: Agent | null | undefined): void {
    const prev = this.agents.get(pty);
    if (next === prev || (next === undefined && prev === undefined)) return;
    if (next) this.agents.set(pty, next);
    else if (prev) this.agents.delete(pty);
    else return;
    if (prev?.state !== next?.state) log.debug(`pty ${pty}: ${prev?.state ?? "none"} -> ${next?.state ?? "none"}`);
    this.listeners.forEach((fn) => fn());
  }
}
