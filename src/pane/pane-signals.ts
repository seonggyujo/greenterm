import type { Terminal } from "@xterm/xterm";
import type { AgentMark } from "../agent/agent-model";
import { watchCwd } from "../terminal/cwd";
import type { PaneHeader } from "./pane-header";

// What a pane's terminal shows in the pane header and tells the agent
// board, and how the board marks the pane back. Signals: the terminal
// title changed, the shell drew its prompt again (so no program runs in
// front of it), the user pressed a key (Esc or Ctrl+C on its own stops an
// agent's turn), the pane got focus, the pane closed.

export type PaneSignal =
  | { kind: "title"; title: string }
  | { kind: "prompt" }
  | { kind: "key"; interrupt: boolean }
  | { kind: "focus" }
  | { kind: "closed" };

/**
 * Title and folder go to the header, signals to `emit`. Returns a reader
 * for the folder the shell last reported. `name` labels log lines.
 */
export function watchPaneTerminal(
  term: Terminal,
  name: () => string,
  header: PaneHeader,
  emit: (signal: PaneSignal) => void,
): () => string | null {
  let where: string | null = null;
  term.onTitleChange((title) => {
    header.setTitle(title);
    emit({ kind: "title", title });
  });
  term.onKey(({ domEvent }) => emit({ kind: "key", interrupt: isInterruptKey(domEvent) }));
  watchCwd(
    term,
    name,
    (path) => {
      where = path;
      header.setCwd(path);
    },
    () => emit({ kind: "prompt" }),
  );
  return () => where;
}

/** Esc or Ctrl+C without other modifiers. Ctrl+C that copies a selection never gets here (see terminal/keys.ts). */
function isInterruptKey(e: KeyboardEvent): boolean {
  if (e.altKey || e.shiftKey || e.metaKey) return false;
  return e.ctrlKey ? e.key.toLowerCase() === "c" : e.key === "Escape";
}

const MARKS: AgentMark[] = ["work", "need", "done"];

/** Colors the pane's status dot by its agent's state; null clears it. */
export function markAgent(el: HTMLElement, mark: AgentMark | null): void {
  MARKS.forEach((m) => el.classList.toggle(`agent-${m}`, m === mark));
}

/** Lights the pane's border while its row in the agent sidebar is hovered. */
export function markHover(el: HTMLElement, on: boolean): void {
  el.classList.toggle("agent-hover", on);
}
