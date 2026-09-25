import "@xterm/xterm/css/xterm.css";
import "./styles/themes.css";
import "./styles/base.css";
import "./styles/titlebar.css";
import "./styles/controls.css";
import "./styles/shell-menu.css";
import "./styles/workspace.css";
import "./styles/pane.css";
import "./styles/split.css";
import "./styles/web-pane.css";
import "./styles/settings.css";
import "./styles/empty-state.css";
import "./styles/effects.css";
import { loadFontSize, saveFontSize } from "./app/font-size";
import { createLogger } from "./app/log";
import { installFileDrop } from "./app/file-drop";
import { applyMotion } from "./app/motion";
import { installLongTaskMonitor } from "./app/perf-monitor";
import { webHomePref } from "./app/prefs";
import { forgetSettings } from "./app/reset";
import { loadDefaultShell, saveDefaultShell, SHELL_LABELS } from "./app/shells";
import { applyTheme, loadTheme } from "./app/theme";
import { UptimeClock } from "./app/uptime-clock";
import { installVisibilityTracking } from "./app/visibility";
import { onOpenFolder, takeLaunchDir } from "./ipc/launch";
import { listShells, type ShellKind } from "./ipc/pty";
import { PaneManager } from "./pane/pane-manager";
import { installShortcutGuard } from "./terminal/keys";
import { createEmptyState } from "./ui/empty-state";
import { createNewTerminalButton } from "./ui/new-terminal-button";
import { createSettings } from "./ui/settings-panel";
import { createShellMenu } from "./ui/shell-menu";
import { createTerminalCount } from "./ui/terminal-count";
import { createTidyButton } from "./ui/tidy-button";
import { createTitlebar } from "./ui/titlebar";

const log = createLogger("app");

async function main(): Promise<void> {
  // Before any DOM is built, so the first paint already has the theme.
  const theme = loadTheme();
  applyTheme(theme);
  applyMotion();
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

  const open = (shell: ShellKind, cwd: string | null = null) => {
    panes.add(shell, cwd).catch((err) => log.error("add terminal failed", err));
  };

  const count = createTerminalCount();
  const empty = createEmptyState(() => open(defaultShell));
  workspace.append(empty.el);

  const tidy = createTidyButton(() => panes.tidy());
  const fontSize = loadFontSize();
  const panes = new PaneManager(
    workspace,
    new UptimeClock(),
    fontSize,
    (c) => {
      count.update(c);
      empty.setVisible(c.total === 0);
    },
    (manual) => tidy.setVisible(manual),
  );
  await panes.init();
  // "Open in greenterm" while this window runs: a new pane in that folder.
  await onOpenFolder((dir) => open(defaultShell, dir));
  await installFileDrop((x, y) => panes.paneAt(x, y));

  const setDefaultShell = (shell: ShellKind) => {
    defaultShell = shell;
    menu.setDefault(shell);
    newButton.setShell(SHELL_LABELS[shell]);
  };

  // The menu only selects the shell; the + button opens it. "Web page"
  // in the same menu opens a web pane right away.
  const menu = createShellMenu(
    shells,
    defaultShell,
    (shell) => {
      log.info(`default shell ${shell}`);
      saveDefaultShell(shell);
      setDefaultShell(shell);
    },
    () => void panes.addWeb(webHomePref.get()).catch((err) => log.error("add web page failed", err)),
  );
  document.body.append(menu.el);

  const newButton = createNewTerminalButton(
    SHELL_LABELS[defaultShell],
    () => open(defaultShell),
    (anchor) => menu.toggle(anchor),
  );
  // Theme, font size and the other preferences live behind the gear.
  const settings = createSettings({
    onTheme: applyTheme,
    onFontSize: (px) => {
      panes.setFontSize(px);
      saveFontSize(px);
    },
    onReset: () => {
      forgetSettings();
      applyTheme(loadTheme());
      applyMotion();
      panes.setFontSize(loadFontSize());
      setDefaultShell(loadDefaultShell(shells));
    },
  });
  document.body.append(settings.panel);
  titlebar.actions.append(tidy.el, count.el, settings.button, newButton.el);

  await panes.add(defaultShell, await takeLaunchDir());
  log.info("ready");
}

main().catch((err) => log.error("startup failed", err));
