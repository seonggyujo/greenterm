import { isAppHidden, onAppVisibility } from "./visibility";

// The only periodic timer in the app: one 1-second interval shared by all
// panes. It stops while the app is hidden or minimized and catches up on
// return.

type Tick = (now: number) => void;

export class UptimeClock {
  private readonly listeners = new Set<Tick>();
  private timer = 0;

  constructor() {
    onAppVisibility(() => this.sync());
  }

  /** Calls `fn` now and then every second. Returns an unsubscribe. */
  subscribe(fn: Tick): () => void {
    this.listeners.add(fn);
    fn(Date.now());
    this.sync();
    return () => {
      this.listeners.delete(fn);
      this.sync();
    };
  }

  private sync(): void {
    const shouldRun = this.listeners.size > 0 && !isAppHidden();
    if (shouldRun && !this.timer) {
      this.tick();
      this.timer = window.setInterval(() => this.tick(), 1000);
    } else if (!shouldRun && this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    }
  }

  private tick(): void {
    const now = Date.now();
    this.listeners.forEach((fn) => fn(now));
  }
}

/** 42s, 3m 07s, 1h 04m */
export function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}
