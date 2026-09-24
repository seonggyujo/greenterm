import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// "Open in greenterm": the folder greenterm was started on, and folders
// sent by later launches while this window is running (see launch.rs).

/** The start folder, or null. Returns it only on the first call. */
export const takeLaunchDir = () => invoke<string | null>("take_launch_dir");

export function onOpenFolder(handler: (dir: string) => void): Promise<UnlistenFn> {
  return listen<string>("open-folder", (event) => handler(event.payload));
}
