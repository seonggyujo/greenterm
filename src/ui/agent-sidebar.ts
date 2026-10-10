import { urgency } from "../agent/agent-model";
import { onAgentHooksChange } from "../app/agent-hooks";
import { sidebarCollapsedPref } from "../app/prefs";
import type { UptimeClock } from "../app/uptime-clock";
import { onLangChange, t } from "../i18n/lang";
import { createAgentHints } from "./agent-hints";
import { createAgentItem, type AgentItem, type AgentRow } from "./agent-item";

// Left sidebar listing the panes that run a coding agent, most urgent first
// (needs you, finished, working, idle), with the notes of agent-hints.ts at
// the bottom. Hidden while no pane has an agent. It collapses to a narrow
// rail of numbered badges; the choice is remembered. Rows are rebuilt when
// an agent changes; the 1-second tick only updates working times.

export interface AgentSidebar {
  el: HTMLElement;
  /** `pluginSeen`: data of the heron-limits plugin has arrived. */
  render(rows: AgentRow[], pluginSeen: boolean): void;
}

export interface SidebarActions {
  onPick(pty: number): void;
  /** The pointer is over a row (or left it: null). */
  onHover(pty: number | null): void;
}

export function createAgentSidebar(clock: UptimeClock, actions: SidebarActions): AgentSidebar {
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
  const hints = createAgentHints();
  foot.append(hints.el);

  let rows: AgentRow[] = [];
  let pluginSeen = false;
  let items: AgentItem[] = [];
  let stopClock: (() => void) | null = null;

  const tick = (now: number) => items.forEach((item) => item.tick(now));

  const draw = () => {
    const sorted = [...rows].sort((a, b) => urgency(a.agent.state) - urgency(b.agent.state) || a.number - b.number);
    // Replaced rows never get mouseleave: drop any pane highlight first.
    actions.onHover(null);
    items = sorted.map((row) => createAgentItem(row, actions.onPick, actions.onHover));
    list.replaceChildren(...items.map((item) => item.el));
    el.hidden = sorted.length === 0;
    const collapsed = sidebarCollapsedPref.get();
    el.classList.toggle("collapsed", collapsed);
    title.textContent = t().agents;
    toggle.textContent = collapsed ? "›" : "‹";
    toggle.title = collapsed ? t().expand : t().collapse;
    toggle.setAttribute("aria-label", toggle.title);
    hints.render(pluginSeen);
    tick(Date.now());
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
    render(nextRows, nextPluginSeen) {
      rows = nextRows;
      pluginSeen = nextPluginSeen;
      draw();
    },
  };
}
