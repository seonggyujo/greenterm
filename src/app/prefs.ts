// Small user preferences set in the settings panel. localStorage is a
// convenience only: any failure keeps the default. Theme and font size
// have their own modules (theme.ts, font-size.ts).

export interface Pref<T> {
  get(): T;
  set(value: T): void;
  /** Back to the default; the stored value is dropped by forgetSettings(). */
  reset(): void;
}

function pref<T>(key: string, fallback: T, parse: (raw: string) => T | undefined): Pref<T> {
  let value = fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) value = parse(raw) ?? fallback;
  } catch {
    /* storage unavailable */
  }
  return {
    get: () => value,
    reset: () => {
      value = fallback;
    },
    set(next) {
      value = next;
      try {
        localStorage.setItem(key, String(next));
      } catch {
        /* storage unavailable */
      }
    },
  };
}

const bool = (raw: string) => (raw === "true" ? true : raw === "false" ? false : undefined);

/** Pane, menu and glow animations. */
export const motionPref = pref("greenterm.motion", true, bool);

/** Close a terminal pane when its shell exits with code 0. */
export const closeOnExitPref = pref("greenterm.closeOnExit", true, bool);

/** Page a new web pane opens. */
export const webHomePref = pref("greenterm.webHome", "https://www.youtube.com/", (raw) =>
  /^https?:\/\/\S+$/i.test(raw) ? raw : undefined,
);

export function resetPrefs(): void {
  [motionPref, closeOnExitPref, webHomePref].forEach((p) => p.reset());
}
