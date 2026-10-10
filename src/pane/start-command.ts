import type { PaneSignal } from "./pane-signals";

// A command typed into a new pane's shell when it first shows its prompt,
// as if the user typed it: `claude` for a new agent, `claude --resume <id>`
// for a session picked in the sidebar. Every shell Heron starts reports its
// prompt (pty/cwd_report.rs), so the command never races the shell's start.

/** Wraps `emit` so that `command` is typed once, after the first prompt signal. */
export function typeAtFirstPrompt(
  command: string | undefined,
  type: (text: string) => void,
  emit: (signal: PaneSignal) => void,
): (signal: PaneSignal) => void {
  let pending = command;
  return (signal) => {
    emit(signal);
    if (signal.kind !== "prompt" || pending === undefined) return;
    type(`${pending}\r`);
    pending = undefined;
  };
}
