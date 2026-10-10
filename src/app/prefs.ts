// Small user preferences: the ones set in the settings panel and a few the
// UI remembers on its own (agent sidebar). localStorage is a convenience
// only: any failure keeps the default. Theme, font size and language have
// their own modules (theme.ts, font-size.ts, i18n/lang.ts).

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

/** The agent sidebar is folded to a rail of dots. */
export const sidebarCollapsedPref = pref("greenterm.sidebarCollapsed", false, bool);

/** The user closed the "install the plugin" hint in the agent sidebar. */
export const pluginHintHiddenPref = pref("greenterm.pluginHintHidden", false, bool);

export function resetPrefs(): void {
  [motionPref, closeOnExitPref, sidebarCollapsedPref, pluginHintHiddenPref].forEach((p) => p.reset());
}
