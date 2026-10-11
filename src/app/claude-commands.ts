// The Claude Code command lines Heron types into a pane's shell: start a
// new session (in a new git worktree of its own branch with
// `--worktree`), or resume one. Only a UUID is ever typed after `--resume`.

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isSessionId = (text: string): boolean => SESSION_ID.test(text);

export const startCommand = (worktree: boolean): string => (worktree ? "claude --worktree" : "claude");

/** Null for anything but a session id. */
export const resumeCommand = (id: string): string | null => (isSessionId(id) ? `claude --resume ${id}` : null);
