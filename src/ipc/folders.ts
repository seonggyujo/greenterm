import { invoke } from "@tauri-apps/api/core";

// Folders (src-tauri/src/commands/folders.rs): what git says about them,
// and the folder picker of "New agent".

/** How far a repository's working tree is from HEAD, new files included. */
export interface Changes {
  added: number;
  removed: number;
  files: number;
}

/** Null outside a git repository, or when git cannot run. */
export const gitChanges = (dir: string) => invoke<Changes | null>("git_changes", { dir });

/** For each folder, whether it is in a git repository. */
export const gitRepos = (dirs: string[]) => invoke<boolean[]>("git_repos", { dirs });

/** A folder the user picks in a dialog, or null when cancelled. */
export const pickFolder = () => invoke<string | null>("pick_folder");
