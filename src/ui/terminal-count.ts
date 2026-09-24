import type { PaneCounts } from "../pane/pane-manager";

// "2 running" style badge in the title bar.

export interface TerminalCount {
  el: HTMLElement;
  update(counts: PaneCounts): void;
}

export function createTerminalCount(): TerminalCount {
  const el = document.createElement("span");
  el.className = "tb-count";
  return {
    el,
    update({ total, running }) {
      el.textContent = running === total ? `${running} running` : `${running} / ${total} running`;
      el.classList.toggle("idle", running === 0);
    },
  };
}
