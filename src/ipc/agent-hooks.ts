import { invoke } from "@tauri-apps/api/core";

// Heron's own Claude Code hooks (src-tauri/src/claude_hooks). The
// commands reject with an error code: "claude-not-found",
// "claude-too-old:<version>", "settings-invalid" or "io".

/** "stale": some entries are missing or run another heron.exe. */
export type HooksPresence = "absent" | "current" | "stale";

export const agentHooksPresence = () => invoke<HooksPresence>("agent_hooks_presence");
export const installAgentHooks = () => invoke<void>("install_agent_hooks");
export const removeAgentHooks = () => invoke<void>("remove_agent_hooks");
