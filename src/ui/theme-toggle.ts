import type { Theme } from "../app/theme";

// Two swatches in the title bar: green / black.

const THEMES: { id: Theme; label: string }[] = [
  { id: "green", label: "Green theme" },
  { id: "black", label: "Black theme" },
];

export function createThemeToggle(initial: Theme, onChange: (theme: Theme) => void): HTMLElement {
  const el = document.createElement("div");
  el.className = "theme-toggle";
  el.setAttribute("role", "radiogroup");
  el.setAttribute("aria-label", "Theme");

  const buttons = THEMES.map(({ id, label }) => {
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
    buttons.forEach((b, i) => b.setAttribute("aria-checked", String(THEMES[i].id === current)));
  }

  function select(theme: Theme): void {
    render(theme);
    onChange(theme);
  }

  render(initial);
  return el;
}
