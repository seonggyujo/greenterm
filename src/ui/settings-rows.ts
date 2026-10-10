import { loadFontSize } from "../app/font-size";
import { createLogger } from "../app/log";
import { motionEnabled, setMotion } from "../app/motion";
import { closeOnExitPref } from "../app/prefs";
import { loadTheme, type Theme } from "../app/theme";
import { createConfirmButton } from "./confirm-button";
import { createFontSizeControl } from "./font-size-control";
import { createSwitch } from "./switch";
import { createThemeToggle } from "./theme-toggle";

// The rows of the settings panel, built from the stored values each time
// the panel opens (and after a reset), so they never show stale values.
// Every change applies at once, is remembered, and is logged.

const log = createLogger("settings");

export interface SettingsActions {
  onTheme(theme: Theme): void;
  onFontSize(px: number): void;
  /** Applies the defaults to what is on screen after the stored values were dropped. */
  onReset(): void;
}

function row(label: string, control: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  el.className = "settings-row";
  const text = document.createElement("span");
  text.className = "settings-label";
  text.textContent = label;
  el.append(text, control);
  return el;
}

function preferenceRows(actions: SettingsActions): HTMLElement[] {
  return [
    row(
      "Theme",
      createThemeToggle(loadTheme(), (theme) => {
        log.info(`theme ${theme}`);
        actions.onTheme(theme);
      }),
    ),
    row("Font size", createFontSizeControl(loadFontSize(), actions.onFontSize)),
    row(
      "Animations",
      createSwitch("Animations", motionEnabled(), (on) => {
        log.info(`animations ${on ? "on" : "off"}`);
        setMotion(on);
      }),
    ),
    row(
      "Close pane on exit 0",
      createSwitch("Close pane when the shell exits cleanly", closeOnExitPref.get(), (on) => {
        log.info(`close pane on exit 0 ${on ? "on" : "off"}`);
        closeOnExitPref.set(on);
      }),
    ),
  ];
}

function dataRows(actions: SettingsActions): HTMLElement[] {
  const reset = createConfirmButton("Reset", async () => {
    log.info("settings reset to defaults");
    actions.onReset();
    return "Done";
  });
  reset.title = "Theme, font size and every option above";
  return [row("Settings", reset)];
}

export function buildRows(actions: SettingsActions): HTMLElement[] {
  const sep = document.createElement("div");
  sep.className = "settings-sep";
  return [...preferenceRows(actions), sep, ...dataRows(actions)];
}
