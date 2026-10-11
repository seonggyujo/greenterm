// The subagents an agent runs right now (pure), from the backend's list
// (src-tauri/src/agent/subagents.rs): Heron's hooks keep one entry per
// subagent from its start to its stop.

export interface Subagent {
  id: string;
  /** The subagent's type, e.g. "Explore"; "agent" when Claude Code gave none. */
  type: string;
  /** Start (ms since 1970). */
  since: number;
}

const record = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** Oldest first; entries without an id are dropped. */
export function subagentsOf(data: unknown, now: number): Subagent[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const r = record(item);
    if (typeof r.id !== "string" || !r.id) return [];
    const type = typeof r.type === "string" && r.type ? r.type : "agent";
    const since = typeof r.started === "number" ? r.started : now;
    return [{ id: r.id, type, since }];
  });
}
