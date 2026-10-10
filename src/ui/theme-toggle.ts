import type { Theme } from "../app/theme";
import { t } from "../i18n/lang";

// Two swatches in the settings panel: green / black. Built each time the
// panel opens, so the labels are always in the current language.

const THEMES: Theme[] = ["green", "black"];

export function createThemeToggle(initial: Theme, onChange: (theme: Theme) => void): HTMLElement {
  const el = document.createElement("div");
  el.className = "theme-toggle";
  el.setAttribute("role", "radiogroup");
  el.setAttribute("aria-label", t().theme);

  const buttons = THEMES.map((id) => {
    const label = id === "green" ? t().themeGreen : t().themeBlack;
    const b = document.createElement("button");
    b.type = "button";
    b.className = `theme-swatch theme-${id}`;
    b.setAttribute("role", "radio");
    b.setAttribute("aria-label", label);
    b.title = label;
    b.addEventListener("click", () => select(id));
    return b;
  });
  el.append(...buttons);

  function render(current: Theme): void {
    buttons.forEach((b, i) => b.setAttribute("aria-checked", String(THEMES[i] === current)));
  }

  function select(theme: Theme): void {
    render(theme);
    onChange(theme);
  }

  render(initial);
  return el;
}
