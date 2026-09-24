// App chrome theme (styles/themes.css). The terminal is never themed.
// localStorage is a convenience only: any failure falls back to green.

export type Theme = "green" | "black";

const KEY = "greenterm.theme";

export function loadTheme(): Theme {
  try {
    if (localStorage.getItem(KEY) === "black") return "black";
  } catch {
    /* storage unavailable */
  }
  return "green";
}

export function applyTheme(theme: Theme): void {
  if (theme === "green") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage unavailable */
  }
}
