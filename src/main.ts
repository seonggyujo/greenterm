import "@xterm/xterm/css/xterm.css";
import "./styles/themes.css";
import "./styles/base.css";
import "./styles/titlebar.css";
import "./styles/controls.css";
import "./styles/shell-menu.css";
import "./styles/workspace.css";
import "./styles/pane.css";
import "./styles/empty-state.css";
import "./styles/effects.css";
import { loadFontSize, saveFontSize } from "./app/font-size";
import { createLogger } from "./app/log";
import { installLongTaskMonitor } from "./app/perf-monitor";
import { loadDefaultShell, saveDefaultShell, SHELL_LABELS } from "./app/shells";
import { applyTheme, loadTheme } from "./app/theme";
import { UptimeClock } from "./app/uptime-clock";
import { installVisibilityTracking } from "./app/visibility";
import { listShells, type ShellKind } from "./ipc/pty";
import { PaneManager } from "./pane/pane-manager";
import { installShortcutGuard } from "./terminal/keys";
import { createEmptyState } from "./ui/empty-state";
import { createFontSizeControl } from "./ui/font-size-control";
import { createNewTerminalButton } from "./ui/new-terminal-button";
import { createShellMenu } from "./ui/shell-menu";
import { createTerminalCount } from "./ui/terminal-count";
import { createThemeToggle } from "./ui/theme-toggle";
import { createTitlebar } from "./ui/titlebar";

const log = createLogger("app");

async function main(): Promise<void> {
  // Before any DOM is built, so the first paint already has the theme.
  const theme = loadTheme();
  applyTheme(theme);
  installShortcutGuard();
  await installVisibilityTracking();
  installLongTaskMonitor();

  const titlebar = createTitlebar();
  const workspace = document.createElement("main");
  workspace.id = "workspace";
  document.body.append(titlebar.el, workspace);

  const shells = await listShells();
  let defaultShell = loadDefaultShell(shells);
  log.info(`shells: ${shells.join(", ")}; default ${defaultShell}`);

  const open = (shell: ShellKind) => {
    panes.add(shell).catch((err) => log.error("add terminal failed", err));
  };

  const count = createTerminalCount();
  const empty = createEmptyState(() => open(defaultShell));
  workspace.append(empty.el);

  const fontSize = loadFontSize();
  const panes = new PaneManager(workspace, new UptimeClock(), fontSize, (c) => {
    count.update(c);
    empty.setVisible(c.total === 0);
  });
  await panes.init();

  // The menu only selects the shell; the + button opens it.
  const menu = createShellMenu(shells, defaultShell, (shell) => {
    defaultShell = shell;
    saveDefaultShell(shell);
    menu.setDefault(shell);
    newButton.setShell(SHELL_LABELS[shell]);
  });
  document.body.append(menu.el);

  const fontControl = createFontSizeControl(fontSize, (px) => {
    panes.setFontSize(px);
    saveFontSize(px);
  });
  const newButton = createNewTerminalButton(
    SHELL_LABELS[defaultShell],
    () => open(defaultShell),
    (anchor) => menu.toggle(anchor),
  );
  const themeToggle = createThemeToggle(theme, applyTheme);
  titlebar.actions.append(count.el, themeToggle, fontControl, newButton.el);

  await panes.add(defaultShell);
  log.info("ready");
}

main().catch((err) => log.error("startup failed", err));
