import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// `agent-update` events from src-tauri/src/agent: the JSON an agent
// integration (the routing-detector plugin) wrote for one pane, unchecked.
//   kind "status": status line snapshot (model check, limits, context)
//   kind "state":  hook state (working, permission, waiting, done, ...)

export interface AgentUpdate {
  pty: number;
  kind: "status" | "state";
  data: unknown;
}

export function onAgentUpdate(handler: (update: AgentUpdate) => void): Promise<UnlistenFn> {
  return listen<AgentUpdate>("agent-update", (event) => handler(event.payload));
}
