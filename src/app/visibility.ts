import { getCurrentWindow } from "@tauri-apps/api/window";
import { createLogger } from "./log";

// Whether anyone can see the app. WebView2 keeps document.hidden false when
// the window is minimized, so the Tauri window state is checked as well.
// While hidden, <html> gets `app-hidden` (pauses CSS animations, see
// styles/effects.css) and listeners are told (the uptime clock stops).

const log = createLogger("visibility");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const listeners = new Set<(hidden: boolean) => void>();

let minimized = false;
let hidden = false;

function update(): void {
  const next = document.hidden || minimized;
  if (next === hidden) return;
  hidden = next;
  document.documentElement.classList.toggle("app-hidden", hidden);
  log.debug(`app hidden = ${hidden}`);
  listeners.forEach((fn) => fn(hidden));
}

export async function installVisibilityTracking(): Promise<void> {
  const win = getCurrentWindow();
  document.addEventListener("visibilitychange", update);
  // Minimize and restore both arrive as resize events.
  await win.onResized(async () => {
    minimized = await win.isMinimized();
    update();
  });
}

export function isAppHidden(): boolean {
  return hidden;
}

export function onAppVisibility(fn: (hidden: boolean) => void): void {
  listeners.add(fn);
}

/** False when nobody can see the animation or the user asked for less motion. */
export function motionAllowed(): boolean {
  return !hidden && !reducedMotion.matches;
}
