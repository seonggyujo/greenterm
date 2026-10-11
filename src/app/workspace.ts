import type { ShellKind } from "../ipc/pty";
import { isSessionId } from "./claude-commands";

// The work Heron saves to reopen on the next start (pure): the panes in
// the order they were opened, each with its shell, its folder and the
// Claude Code session that ran in it, and the user's own arrangement
// (layout/tree-shape.ts checks that one when it is put back). What is read
// back is checked here: unknown shells and anything not a session id drop.

export interface SavedPane {
  shell: ShellKind;
  /** null = home. */
  cwd: string | null;
  session: string | null;
}

export interface SavedWorkspace {
  panes: SavedPane[];
  /** A split tree of pane positions, or null for the automatic grid. */
  layout: unknown;
}

const record = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const text = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/** The saved text, or null when it is missing or broken. */
export function parseWorkspace(raw: string | null, shells: readonly ShellKind[], fallback: ShellKind): SavedWorkspace | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  const saved = record(value);
  if (!Array.isArray(saved.panes)) return null;
  const panes = saved.panes.map((item): SavedPane => {
    const p = record(item);
    const shell = shells.find((s) => s === p.shell) ?? fallback;
    const session = text(p.session);
    return { shell, cwd: text(p.cwd), session: session && isSessionId(session) ? session : null };
  });
  return { panes, layout: saved.layout ?? null };
}
