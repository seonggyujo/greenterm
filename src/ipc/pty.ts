import { Channel, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Typed wrappers around the Rust PTY commands. Output arrives as raw bytes
// (ArrayBuffer), never as a string, so UTF-8 split across chunks stays
// intact until xterm decodes it.

export type ShellKind = "pwsh" | "powershell" | "cmd" | "gitbash";

/** Shells installed on this machine, in menu order. */
export const listShells = () => invoke<ShellKind[]>("list_shells");

export interface PtyExit {
  id: number;
  code: number;
}

export function spawnPty(
  shell: ShellKind,
  cols: number,
  rows: number,
  cwd: string | null,
  onOutput: (data: Uint8Array) => void,
): Promise<number> {
  const channel = new Channel<ArrayBuffer>();
  channel.onmessage = (buf) => onOutput(new Uint8Array(buf));
  return invoke<number>("spawn_pty", { shell, cols, rows, cwd, onOutput: channel });
}

export const writePty = (id: number, data: string) => invoke<void>("write_pty", { id, data });

export const resizePty = (id: number, cols: number, rows: number) =>
  invoke<void>("resize_pty", { id, cols, rows });

export const pausePty = (id: number) => invoke<void>("pause_pty", { id });

export const resumePty = (id: number) => invoke<void>("resume_pty", { id });

export const killPty = (id: number) => invoke<void>("kill_pty", { id });

export function onPtyExit(handler: (e: PtyExit) => void): Promise<UnlistenFn> {
  return listen<PtyExit>("pty-exit", (event) => handler(event.payload));
}
