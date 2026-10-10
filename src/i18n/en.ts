// Every string the app shows, in English. The Korean table (ko.ts) must
// have the same keys. Shell names (PowerShell, Git Bash, ...) and log
// messages are not translated.

export const en = {
  // Title bar
  minimize: "Minimize",
  maximize: "Maximize",
  close: "Close",
  newTerminal: "New terminal",
  chooseShell: "Choose shell",
  tidy: "Back to automatic grid",
  running: (n: number) => `${n} running`,
  runningOf: (n: number, total: number) => `${n} / ${total} running`,

  // Empty state
  emptyCaption: "new terminal",

  // Pane header
  closeTerminal: "Close terminal",
  exitCode: (code: number) => `exit ${code}`,
  failedToStart: "failed to start",

  // Settings
  settings: "Settings",
  theme: "Theme",
  themeGreen: "Green theme",
  themeBlack: "Black theme",
  language: "Language",
  fontSize: "Font size",
  fontSmaller: "Smaller font",
  fontLarger: "Larger font",
  animations: "Animations",
  closeOnExit: "Close pane on exit 0",
  closeOnExitHint: "Close pane when the shell exits cleanly",
  agentHooks: "Claude Code hooks",
  agentHooksHint: "Show permission requests, questions and model checks in the sidebar. Adds Heron's hooks to Claude Code's settings.json",
  reset: "Reset",
  resetHint: "Theme, font size, language and the options above, except Claude Code hooks",
  sure: "Sure?",
  done: "Done",

  // Agent sidebar
  agents: "Agents",
  collapse: "Collapse",
  expand: "Expand",
  agentIdle: "idle",
  agentWorking: "working",
  agentPermission: "needs permission",
  agentQuestion: "has a question",
  agentWaiting: "waiting for you",
  agentDone: "done",
  agentMismatch: (selected: string, actual: string) => `Selected ${selected}, answered by ${actual}`,
  agentPluginHint: "Install the heron-limits plugin to see usage limits and context use",
  hooksOffer: "See permission requests, questions and model checks too: Heron adds its hooks to Claude Code's settings.json.",
  hooksTurnOn: "Turn on",
  hooksTurningOn: "Turning on…",
  hooksNoClaude: "Claude Code was not found. Check that claude runs in a terminal.",
  hooksOldClaude: (version: string) => `Needs Claude Code 2.1.139 or later (found ${version}).`,
  hooksBadSettings: "Claude Code's settings.json is not valid JSON, so it was left alone.",
  hooksFailed: "Could not change Claude Code's settings.",
  hide: "Hide",
  newAgent: "New agent",
  newAgentIn: (folder: string) => `Start Claude Code in a new pane, in ${folder}`,
  noAgents: "No agent running",
  recentSessions: "Recent sessions",
  recentHint: "Click to resume",
  resume: "Resume",
  justNow: "just now",
  moreAbove: (n: number) => `↑ ${n} more`,
  moreBelow: (n: number) => `↓ ${n} more`,
  deleteHint: "Right-click to delete (to the Recycle Bin)",
  deleteAsk: "Delete?",
  deleteYes: "Delete",
  deleteNo: "Cancel",
  deleteRunning: "It runs in another terminal",
  deleteFailed: "Could not delete it",

  // Usage bar
  limitFiveHour: "5-hour limit",
  limitWeekly: "Weekly limit",
  limitResets: (left: string) => `resets in ${left}`,
  context: "Context",
  contextUsed: (folder: string, percent: number) => `${folder}: ${percent}% of the context window used`,
};

export type Strings = typeof en;
