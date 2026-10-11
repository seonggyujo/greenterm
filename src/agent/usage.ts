// The heron-limits plugin's status file for one pane: the account's usage
// limits (5-hour and weekly) and how much of its context window the
// agent uses. Pure: the file comes in unchecked (ipc/agent.ts).

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

const record = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const number = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * The limits in a status file, or null when it has none: a new session's
 * status line has no limits before its first answer, and the last known
 * ones must stay on screen meanwhile.
 */
export function limitsOf(data: unknown): Limits | null {
  const d = record(data);
  const at = number(d.at);
  if (at === null) return null;
  const limit = (v: unknown): Limit | null => {
    const used = number(record(v).used);
    return used === null ? null : { used, resetsAt: number(record(v).resets_at) };
  };
  const l = record(d.limits);
  const fiveHour = limit(l.five_hour);
  const sevenDay = limit(l.seven_day);
  return fiveHour || sevenDay ? { fiveHour, sevenDay, at } : null;
}

/** Percent of the context window in use, or null before the first answer. */
export function contextOf(data: unknown): number | null {
  return number(record(data).context);
}

/** How full a meter looks: green, yellow from 70%, red from 90%. */
export type Fill = "ok" | "warn" | "bad";

export function fillOf(percent: number): Fill {
  if (percent >= 90) return "bad";
  return percent >= 70 ? "warn" : "ok";
}
