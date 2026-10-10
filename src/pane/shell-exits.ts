import { closeOnExitPref } from "../app/prefs";
import { onPtyExit } from "../ipc/pty";
import type { Pane } from "./pane";

// What happens when a shell ends, like Windows Terminal: a clean exit
// closes the pane (unless turned off in the settings), a failure keeps it
// open so the output and the exit code can be read.

export interface ExitHost {
  find(pty: number): Pane | undefined;
  close(pane: Pane): void;
  /** The pane stays: counts and badges need a redraw. */
  changed(): void;
}

export async function watchShellExits(host: ExitHost): Promise<void> {
  await onPtyExit(({ id, code }) => {
    const pane = host.find(id);
    if (!pane) return;
    pane.markExited(code);
    if (code === 0 && closeOnExitPref.get()) host.close(pane);
    else host.changed();
  });
}
