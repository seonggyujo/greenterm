import { agentHooksPresence, installAgentHooks, removeAgentHooks } from "../ipc/agent-hooks";
import { createLogger } from "./log";
import { agentHooksWantedPref } from "./prefs";

// Whether Heron's Claude Code hooks are on, shared by the agent sidebar
// and Settings. The choice is remembered, so at start hooks that an update
// took away (the uninstaller removes them) or that run a moved
// heron.exe are put back.

const log = createLogger("hooks");
const listeners = new Set<() => void>();
let on = false;

export const agentHooksOn = (): boolean => on;

export function onAgentHooksChange(fn: () => void): void {
  listeners.add(fn);
}

function set(next: boolean): void {
  if (next === on) return;
  on = next;
  listeners.forEach((fn) => fn());
}

export async function syncAgentHooks(): Promise<void> {
  try {
    const presence = await agentHooksPresence();
    log.debug(`claude hooks ${presence}`);
    set(presence !== "absent");
    // Hooks of this heron.exe were turned on here, also when a reset
    // forgot that.
    if (presence === "current") agentHooksWantedPref.set(true);
    else if (agentHooksWantedPref.get()) await setAgentHooks(true);
  } catch (err) {
    log.warn("claude hooks check failed", err);
  }
}

/** Turns the hooks on or off. Resolves to an error code, or null when it worked. */
export async function setAgentHooks(want: boolean): Promise<string | null> {
  try {
    await (want ? installAgentHooks() : removeAgentHooks());
  } catch (err) {
    log.warn(`claude hooks ${want ? "on" : "off"} failed: ${err}`);
    return String(err);
  }
  agentHooksWantedPref.set(want);
  log.info(`claude hooks ${want ? "on" : "off"}`);
  set(want);
  return null;
}
