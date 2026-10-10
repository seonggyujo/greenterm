import { createLogger } from "../app/log";
import type { AgentUpdate } from "../ipc/agent";
import { applyCheck, applyInput, applySeen, applyState, applyStatus, applyTitle, type Agent, type AgentState } from "./agent-model";
import { limitsOf, type Limits } from "./usage";

// The agents of all panes, keyed by pty id, and the newest usage limits.
// Every signal goes through the pure functions in agent-model.ts and
// usage.ts; listeners hear about any change.

/** What changed for one pane; a state is null while the pane has no agent. */
export interface AgentChange {
  pty: number;
  from: AgentState | null;
  to: AgentState | null;
}

const log = createLogger("agents");

export class AgentBoard {
  private readonly agents = new Map<number, Agent>();
  private latestLimits: Limits | null = null;
  private readonly listeners = new Set<(change: AgentChange) => void>();

  get limits(): Limits | null {
    return this.latestLimits;
  }

  get(pty: number): Agent | undefined {
    return this.agents.get(pty);
  }

  /** What the hooks, the plugin or the model check reported for a pane. */
  update({ pty, kind, data }: AgentUpdate): void {
    const now = Date.now();
    const prev = this.agents.get(pty);
    if (kind === "status") {
      const limits = limitsOf(data);
      if (limits && (!this.latestLimits || limits.at >= this.latestLimits.at)) this.latestLimits = limits;
      this.set(pty, applyStatus(prev, data, now));
    } else if (kind === "check") {
      this.set(pty, applyCheck(prev, data));
    } else {
      this.set(pty, applyState(prev, data, now));
    }
  }

  title(pty: number, title: string): void {
    this.set(pty, applyTitle(this.agents.get(pty), title, Date.now()));
  }

  input(pty: number, interrupt: boolean): void {
    const a = this.agents.get(pty);
    if (a) this.set(pty, applyInput(a, Date.now(), interrupt));
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
  subscribe(fn: (change: AgentChange) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(pty: number, next: Agent | null | undefined): void {
    const prev = this.agents.get(pty);
    if (next === prev || (next === undefined && prev === undefined)) return;
    if (next) this.agents.set(pty, next);
    else if (prev) this.agents.delete(pty);
    else return;
    const change: AgentChange = { pty, from: prev?.state ?? null, to: next?.state ?? null };
    if (change.from !== change.to) log.debug(`pty ${pty}: ${change.from ?? "none"} -> ${change.to ?? "none"}`);
    this.listeners.forEach((fn) => fn(change));
  }
}
