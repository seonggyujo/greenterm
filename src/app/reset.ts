import { resetPrefs } from "./prefs";

// Settings > Reset settings: forgets every stored Heron.* value, so
// theme, font size, default shell and the other preferences fall back to
// their defaults. The caller applies them to what is on screen.

const PREFIX = "heron.";

export function forgetSettings(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable */
  }
  resetPrefs();
}
