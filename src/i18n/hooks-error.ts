import { t } from "./lang";

// The message for an error code of the hook commands (ipc/agent-hooks.ts),
// shown by the sidebar offer and by Settings.

const TOO_OLD = "claude-too-old:";

export function hooksErrorText(code: string): string {
  const s = t();
  if (code === "claude-not-found") return s.hooksNoClaude;
  if (code.startsWith(TOO_OLD)) return s.hooksOldClaude(code.slice(TOO_OLD.length));
  if (code === "settings-invalid") return s.hooksBadSettings;
  return s.hooksFailed;
}
