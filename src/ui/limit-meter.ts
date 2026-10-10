import type { Limit } from "../agent/agent-model";

// One usage limit in the agent dock: "5h ▮▮▮▯ 42% 2h13m". The bar turns
// yellow from 70% and red from 90%. Hidden while the limit is unknown.

export interface LimitMeter {
  el: HTMLElement;
  show(limit: Limit | null, nowSec: number): void;
}

/** 2h13m, 3d4h, 12m: time left until the limit resets. */
export function formatResetIn(seconds: number): string {
  const m = Math.max(0, Math.round(seconds / 60));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${String(m % 60).padStart(2, "0")}m`;
  return `${Math.floor(h / 24)}d${h % 24}h`;
}

export function createLimitMeter(label: string, title: (resetIn: string) => string): LimitMeter {
  const el = document.createElement("span");
  el.className = "limit-meter";
  el.innerHTML =
    '<span class="limit-label"></span><span class="limit-track"><span class="limit-fill"></span></span>' +
    '<span class="limit-used"></span><span class="limit-reset"></span>';
  const [name, , used, reset] = Array.from(el.children) as HTMLElement[];
  const fill = el.querySelector<HTMLElement>(".limit-fill")!;
  name.textContent = label;

  return {
    el,
    show(limit, nowSec) {
      el.hidden = !limit;
      if (!limit) return;
      const pct = Math.min(100, Math.max(0, limit.used));
      fill.style.width = `${pct}%`;
      el.classList.toggle("warn", pct >= 70 && pct < 90);
      el.classList.toggle("bad", pct >= 90);
      used.textContent = `${Math.round(pct)}%`;
      const left = limit.resetsAt ? formatResetIn(limit.resetsAt - nowSec) : "";
      reset.textContent = left;
      el.title = left ? title(left) : "";
    },
  };
}
