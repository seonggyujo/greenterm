import { loadFontSize } from "../app/font-size";
import { createLogger } from "../app/log";
import { motionEnabled, setMotion } from "../app/motion";
import { closeOnExitPref, webHomePref } from "../app/prefs";
import { loadTheme, type Theme } from "../app/theme";
import { clearWebData } from "../ipc/web";
import { toUrl } from "../web/to-url";
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

function webHomeInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.className = "settings-text";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Web start page");
  input.value = webHomePref.get();
  input.addEventListener("change", () => {
    if (input.value.trim()) {
      webHomePref.set(toUrl(input.value));
      log.info(`web start page ${webHomePref.get()}`);
    }
    input.value = webHomePref.get();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
  });
  return input;
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
    row("Web start page", webHomeInput()),
  ];
}

function dataRows(actions: SettingsActions): HTMLElement[] {
  const clear = createConfirmButton("Clear", async () => {
    try {
      await clearWebData();
      log.info("web data cleared");
      return "Cleared";
    } catch (err) {
      log.warn("clear web data failed", err);
      return "In use, retry";
    }
  });
  clear.title = "Cookies, history and site data of web panes";
  const reset = createConfirmButton("Reset", async () => {
    log.info("settings reset to defaults");
    actions.onReset();
    return "Done";
  });
  reset.title = "Theme, font size and every option above";
  return [row("Web data", clear), row("Settings", reset)];
}

export function buildRows(actions: SettingsActions): HTMLElement[] {
  const sep = document.createElement("div");
  sep.className = "settings-sep";
  return [...preferenceRows(actions), sep, ...dataRows(actions)];
}
