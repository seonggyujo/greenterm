import type { AgentState } from "./agent/agent-model";
import { folderKey } from "./agent/session-groups";
import { createLogger } from "./app/log";
import type { UptimeClock } from "./app/uptime-clock";
import { gitChanges, type Changes } from "./ipc/folders";

// How far each agent's folder is from its last commit, for the sidebar
// rows of wire-agents.ts: asks git through ipc/folders.ts and keeps the
// answers. A folder is asked again when its agent's state changes, when the
// window gets focus, and every 15 s while its agent works; an answer that
// differs asks for a redraw.

const log = createLogger("changes");

const WHILE_WORKING_MS = 15_000;

/** An agent row's pane, folder and state. */
export interface WatchedAgent {
  pty: number;
  folder: string;
  state: AgentState;
}

export class ChangeWatch {
  private agents: WatchedAgent[] = [];
  private readonly states = new Map<number, AgentState>();
  private readonly known = new Map<string, Changes | null>();
  private readonly askedAt = new Map<string, number>();
  private readonly busy = new Set<string>();
  /** Asked while busy: ask once more when the answer comes. */
  private readonly again = new Set<string>();
  private stopClock: (() => void) | null = null;

  constructor(
    private readonly clock: UptimeClock,
    private readonly onChange: () => void,
  ) {
    window.addEventListener("focus", () => this.agents.forEach((a) => this.ask(a.folder)));
  }

  /** Null until git answered, and outside a repository. */
  of(folder: string): Changes | null {
    return this.known.get(folderKey(folder)) ?? null;
  }

  /** The agents now; asks git about the folders whose agent changed state. */
  watch(agents: WatchedAgent[]): void {
    this.agents = agents;
    for (const pty of [...this.states.keys()]) {
      if (!agents.some((a) => a.pty === pty)) this.states.delete(pty);
    }
    for (const a of agents) {
      if (this.states.get(a.pty) === a.state) continue;
      this.states.set(a.pty, a.state);
      this.ask(a.folder);
    }
    const working = agents.some((a) => a.state === "working");
    if (working && !this.stopClock) this.stopClock = this.clock.subscribe((now) => this.tick(now));
    else if (!working && this.stopClock) {
      this.stopClock();
      this.stopClock = null;
    }
  }

  private tick(now: number): void {
    for (const a of this.agents) {
      if (a.state === "working" && now - (this.askedAt.get(folderKey(a.folder)) ?? 0) >= WHILE_WORKING_MS) this.ask(a.folder);
    }
  }

  private ask(folder: string): void {
    const key = folderKey(folder);
    if (this.busy.has(key)) {
      this.again.add(key);
      return;
    }
    this.busy.add(key);
    this.askedAt.set(key, Date.now());
    gitChanges(folder)
      .then((changes) => {
        const differs = JSON.stringify(changes) !== JSON.stringify(this.known.get(key) ?? null);
        this.known.set(key, changes);
        if (differs) this.onChange();
      })
      .catch((err) => log.warn(`git changes of ${folder} failed`, err))
      .finally(() => {
        this.busy.delete(key);
        if (this.again.delete(key)) this.ask(folder);
      });
  }
}
