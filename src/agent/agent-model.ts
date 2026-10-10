// What greenterm knows about the coding agent (Claude Code) in one pane, and
// how each signal changes it. Pure: no DOM, no IPC. Two sources:
//   - plugin files (exact): state, model check, limits (ipc/agent.ts)
//   - the terminal title (rough, needs no plugin): Claude Code shows
//     "✳ <title>" while idle and a turning half circle while it works
// Once plugin data has arrived for a pane, it decides the state.

export type AgentState = "idle" | "working" | "permission" | "question" | "waiting" | "done";
export type CheckState = "ok" | "mismatch" | "pending";

export interface ModelCheck {
  state: CheckState;
  selected: string | null;
  actual: string | null;
}

export interface Agent {
  state: AgentState;
  /** When the state began (ms), for "working 2:14". */
  since: number;
  /** Plugin data has arrived for this pane. */
  fromPlugin: boolean;
  /** Session title from the terminal title. */
  title: string | null;
  /** Notification text, e.g. which tool needs permission. */
  message: string | null;
  check: ModelCheck | null;
  /** The agent's working folder (plugin only). */
  cwd: string | null;
}

export interface Limit {
  used: number;
  /** Epoch seconds. */
  resetsAt: number | null;
}

export interface Limits {
  fiveHour: Limit | null;
  sevenDay: Limit | null;
  /** When the plugin wrote them (ms), to keep the newest. */
  at: number;
}

const STATES: readonly AgentState[] = ["idle", "working", "permission", "question", "waiting", "done"];
const WORKING_TITLE = /^[◐◓◑◒]\s+(.*)$/u;
const IDLE_TITLE = /^✳\s+(.*)$/u;

const record = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const text = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const number = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const fresh = (now: number): Agent => ({
  state: "idle",
  since: now,
  fromPlugin: false,
  title: null,
  message: null,
  check: null,
  cwd: null,
});

function withState(a: Agent, state: AgentState, now: number): Agent {
  return a.state === state ? a : { ...a, state, since: now };
}

/** Plugin state file. Null when the session ended. */
export function applyState(prev: Agent | undefined, data: unknown, now: number): Agent | null | undefined {
  const d = record(data);
  if (d.state === "ended") return null;
  const state = STATES.find((s) => s === d.state);
  if (!state) return prev;
  const a = withState({ ...(prev ?? fresh(now)), fromPlugin: true }, state, now);
  return { ...a, message: text(d.message), cwd: text(d.cwd) ?? a.cwd };
}

/** Plugin status file: the model check. Limits are read by limitsOf. */
export function applyStatus(prev: Agent | undefined, data: unknown, now: number): Agent {
  const c = record(record(data).check);
  const state: CheckState | null = c.state === "ok" || c.state === "mismatch" || c.state === "pending" ? c.state : null;
  const check: ModelCheck | null = state ? { state, selected: text(c.selected), actual: text(c.actual) } : null;
  const a = prev ?? fresh(now);
  return { ...a, fromPlugin: true, check, cwd: text(record(data).cwd) ?? a.cwd };
}

export function limitsOf(data: unknown): Limits | null {
  const d = record(data);
  const at = number(d.at);
  if (at === null) return null;
  const limit = (v: unknown): Limit | null => {
    const used = number(record(v).used);
    return used === null ? null : { used, resetsAt: number(record(v).resets_at) };
  };
  const l = record(d.limits);
  return { fiveHour: limit(l.five_hour), sevenDay: limit(l.seven_day), at };
}

/** Claude Code's terminal title, or null for any other title. */
export function readTitle(title: string): { working: boolean; title: string } | null {
  const working = WORKING_TITLE.exec(title);
  if (working) return { working: true, title: working[1] };
  const idle = IDLE_TITLE.exec(title);
  return idle ? { working: false, title: idle[1] } : null;
}

export function applyTitle(prev: Agent | undefined, title: string, now: number): Agent | undefined {
  const read = readTitle(title);
  if (!read) return prev;
  const a = { ...(prev ?? fresh(now)), title: read.title };
  if (a.fromPlugin) return a;
  if (read.working) return withState(a, "working", now);
  return withState(a, a.state === "working" || a.state === "done" ? "done" : "idle", now);
}

/**
 * The user typed in the pane: an answered permission or question means work
 * goes on. Esc or Ctrl+C stops the turn, and Claude Code runs no Stop hook
 * for a stopped turn, so only the key tells that the agent is idle again.
 */
export function applyInput(a: Agent, now: number, interrupt: boolean): Agent {
  if (interrupt && (a.state === "working" || a.state === "permission")) return withState(a, "idle", now);
  return a.state === "permission" || a.state === "question" ? withState(a, "working", now) : a;
}

/** Sort key, most urgent first: needs you, finished, working, idle. */
export function urgency(state: AgentState): number {
  return { permission: 0, question: 0, waiting: 1, done: 1, working: 2, idle: 3 }[state];
}

/** How a state looks: green while working, yellow when it needs you, blue when done. */
export type AgentMark = "work" | "need" | "done" | "idle";

export function markOf(state: AgentState): AgentMark {
  if (state === "working") return "work";
  if (state === "permission" || state === "question") return "need";
  if (state === "done" || state === "waiting") return "done";
  return "idle";
}

/** Worth a taskbar flash: the agent now needs the user, or just finished its turn. */
export function wantsAttention(from: AgentState | null, to: AgentState | null): boolean {
  if (to !== "permission" && to !== "question" && to !== "done") return false;
  return from === null || markOf(from) !== markOf(to);
}

/** The pane got focus: a finished turn has been seen. */
export function applySeen(a: Agent, now: number): Agent {
  return a.state === "done" || a.state === "waiting" ? withState(a, "idle", now) : a;
}
