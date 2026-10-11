import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// `agent-update` events from src-tauri/src/agent for one pane, unchecked:
//   kind "state":  Heron's hooks (working, permission, waiting, done, ...)
//   kind "check":  the backend's model check (ok, mismatch, pending)
//   kind "status": the heron-limits plugin's status line (limits, context)
//   kind "subagents": the subagents running now (Heron's hooks)

export interface AgentUpdate {
  pty: number;
  kind: "status" | "state" | "check" | "subagents";
  data: unknown;
}

export function onAgentUpdate(handler: (update: AgentUpdate) => void): Promise<UnlistenFn> {
  return listen<AgentUpdate>("agent-update", (event) => handler(event.payload));
}
