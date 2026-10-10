// Every string the app shows, in English and Korean. Shell names (PowerShell,
// Git Bash, ...) and log messages are not translated.

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
  reset: "Reset",
  resetHint: "Theme, font size, language and every option above",
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
  limitResets: (left: string) => `Resets in ${left}`,
  agentPluginHint: "Install the routing-detector plugin for permission alerts, model checks and limits",
  hide: "Hide",
};

export type Strings = typeof en;

export const ko: Strings = {
  minimize: "최소화",
  maximize: "최대화",
  close: "닫기",
  newTerminal: "새 터미널",
  chooseShell: "셸 선택",
  tidy: "자동 격자로 되돌리기",
  running: (n) => `${n}개 실행 중`,
  runningOf: (n, total) => `${total}개 중 ${n}개 실행 중`,

  emptyCaption: "새 터미널",

  closeTerminal: "터미널 닫기",
  exitCode: (code) => `exit ${code}`,
  failedToStart: "시작 실패",

  settings: "설정",
  theme: "테마",
  themeGreen: "초록 테마",
  themeBlack: "블랙 테마",
  language: "언어",
  fontSize: "글씨 크기",
  fontSmaller: "글씨 작게",
  fontLarger: "글씨 크게",
  animations: "애니메이션",
  closeOnExit: "exit 0이면 pane 닫기",
  closeOnExitHint: "셸이 정상 종료되면 pane 닫기",
  reset: "초기화",
  resetHint: "테마, 글씨 크기, 언어와 위의 모든 설정",
  sure: "정말요?",
  done: "완료",

  agents: "에이전트",
  collapse: "접기",
  expand: "펼치기",
  agentIdle: "대기",
  agentWorking: "작업 중",
  agentPermission: "권한 필요",
  agentQuestion: "질문 있음",
  agentWaiting: "입력 대기",
  agentDone: "끝남",
  agentMismatch: (selected, actual) => `선택 ${selected}, 실제 응답 ${actual}`,
  limitResets: (left) => `${left} 뒤 초기화`,
  agentPluginHint: "routing-detector 플러그인을 설치하면 권한 알림, 모델 확인, 한도가 보여요",
  hide: "숨기기",
};
