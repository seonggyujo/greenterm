import { onLangChange, t } from "../i18n/lang";
import type { PaneCounts } from "../pane/pane-counts";

// "2 running" style badge in the title bar.

export interface TerminalCount {
  el: HTMLElement;
  update(counts: PaneCounts): void;
}

export function createTerminalCount(): TerminalCount {
  const el = document.createElement("span");
  el.className = "tb-count";
  let last: PaneCounts = { terminals: 0, running: 0 };

  const render = () => {
    const { terminals, running } = last;
    el.textContent = running === terminals ? t().running(running) : t().runningOf(running, terminals);
    el.classList.toggle("idle", running === 0);
  };
  onLangChange(render);

  return {
    el,
    update(counts) {
      last = counts;
      render();
    },
  };
}
