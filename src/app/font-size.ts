// Terminal font size shared by every pane, remembered across launches.
// localStorage is a convenience only: any failure falls back to the default.

export const FONT_MIN = 10;
export const FONT_MAX = 24;
const FONT_DEFAULT = 14;
const KEY = "greenterm.fontSize";

export function loadFontSize(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    if (v >= FONT_MIN && v <= FONT_MAX) return v;
  } catch {
    /* storage unavailable */
  }
  return FONT_DEFAULT;
}

export function saveFontSize(px: number): void {
  try {
    localStorage.setItem(KEY, String(px));
  } catch {
    /* storage unavailable */
  }
}

export const clampFontSize = (px: number): number => Math.min(FONT_MAX, Math.max(FONT_MIN, px));
