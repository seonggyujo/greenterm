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
};
