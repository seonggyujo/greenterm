import type { AgentBoard } from "../agent/agent-board";
import { urgency } from "../agent/agent-model";
import { onAgentHooksChange } from "../app/agent-hooks";
import { sidebarCollapsedPref } from "../app/prefs";
import type { UptimeClock } from "../app/uptime-clock";
import { onLangChange, t } from "../i18n/lang";
import { createAgentHints } from "./agent-hints";
import { createAgentItem, type AgentItem } from "./agent-item";
import { createLimitMeter } from "./limit-meter";

// Left sidebar listing the panes that run a coding agent, most urgent first
// (needs you, finished, working, idle), with the usage limits and the
// notes of agent-hints.ts at the bottom. Hidden while no pane has an agent. It collapses to a narrow rail
// of dots and pane numbers; the choice is remembered. Rows are rebuilt
// when an agent changes; the 1-second tick only updates times and limits.

export interface SidebarPane {
  pty: number;
  /** 1-based position among the panes. */
  number: number;
  folder: string;
}

export interface AgentSidebar {
  el: HTMLElement;
  render(panes: SidebarPane[]): void;
}

export interface SidebarActions {
  onPick(pty: number): void;
  /** The pointer is over a row (or left it: null). */
  onHover(pty: number | null): void;
}

export function createAgentSidebar(board: AgentBoard, clock: UptimeClock, actions: SidebarActions): AgentSidebar {
  const el = document.createElement("aside");
  el.className = "agent-sidebar";
  el.hidden = true;
  el.classList.toggle("collapsed", sidebarCollapsedPref.get());
  el.innerHTML =
    '<div class="sidebar-head"><span class="sidebar-title"></span><button type="button" class="sidebar-toggle"></button></div>' +
    '<div class="sidebar-list"></div><div class="sidebar-foot"></div>';
  const title = el.querySelector<HTMLElement>(".sidebar-title")!;
  const toggle = el.querySelector<HTMLButtonElement>(".sidebar-toggle")!;
  const list = el.querySelector<HTMLElement>(".sidebar-list")!;
  const foot = el.querySelector<HTMLElement>(".sidebar-foot")!;
  const fiveHour = createLimitMeter("5h", (left) => t().limitResets(left));
  const sevenDay = createLimitMeter("7d", (left) => t().limitResets(left));
  const hints = createAgentHints();
  foot.append(fiveHour.el, sevenDay.el, hints.el);

  let panes: SidebarPane[] = [];
  let items: AgentItem[] = [];
  let stopClock: (() => void) | null = null;

  const tick = () => {
    const now = Date.now();
    items.forEach((item) => item.tick(now));
    fiveHour.show(board.limits?.fiveHour ?? null, now / 1000);
    sevenDay.show(board.limits?.sevenDay ?? null, now / 1000);
  };

  const draw = () => {
    const rows = panes
      .flatMap((p) => {
        const agent = board.get(p.pty);
        return agent ? [{ ...p, agent }] : [];
      })
      .sort((a, b) => urgency(a.agent.state) - urgency(b.agent.state) || a.number - b.number);
    // Replaced rows never get mouseleave: drop any pane highlight first.
    actions.onHover(null);
    items = rows.map((row) => createAgentItem(row, actions.onPick, actions.onHover));
    list.replaceChildren(...items.map((item) => item.el));
    el.hidden = rows.length === 0;
    const collapsed = sidebarCollapsedPref.get();
    el.classList.toggle("collapsed", collapsed);
    title.textContent = t().agents;
    toggle.textContent = collapsed ? "›" : "‹";
    toggle.title = collapsed ? t().expand : t().collapse;
    toggle.setAttribute("aria-label", toggle.title);
    hints.render(board.limits !== null || rows.some((r) => r.agent.check !== null));
    tick();
    // The clock ticks only while the sidebar shows.
    if (!el.hidden && !stopClock) stopClock = clock.subscribe(tick);
    else if (el.hidden && stopClock) {
      stopClock();
      stopClock = null;
    }
  };

  toggle.addEventListener("click", () => {
    sidebarCollapsedPref.set(!sidebarCollapsedPref.get());
    draw();
  });
  onLangChange(draw);
  onAgentHooksChange(draw);

  return {
    el,
    render(next) {
      panes = next;
      draw();
    },
  };
}
