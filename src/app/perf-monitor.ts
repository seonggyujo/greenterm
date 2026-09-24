import { createLogger } from "./log";

// Dev-only: logs every long task (main thread busy > 50ms), the same data
// as the DevTools Performance panel. Compiled out of production builds.

const log = createLogger("perf");

export function installLongTaskMonitor(): void {
  if (!import.meta.env.DEV || !PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
    return;
  }
  let count = 0;
  let worst = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      count += 1;
      worst = Math.max(worst, entry.duration);
      log.warn(`long task ${entry.duration.toFixed(0)}ms (total ${count}, worst ${worst.toFixed(0)}ms)`);
    }
  }).observe({ type: "longtask", buffered: true });
  log.debug("long task monitor on");
}
