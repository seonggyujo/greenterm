import type { AgentBoard } from "../agent/agent-board";
import { markOf, type Agent } from "../agent/agent-model";
import { formatUptime, type UptimeClock } from "../app/uptime-clock";
import { onLangChange, t } from "../i18n/lang";
import { createLimitMeter } from "./limit-meter";

// Bottom band: a chip per pane with a coding agent (pane number, state,
// folder, model warning) and the usage limits on the right. Hidden while no
// pane has an agent. A click on a chip focuses that pane. Without the
// plugin only working/idle/done is known, so a small hint offers it.
// Chips are rebuilt when an agent changes; the 1-second tick only updates
// the working time and the limits.

export interface DockPane {
  pty: number;
  /** 1-based position among the panes. */
  number: number;
  folder: string;
}

export interface AgentDock {
  el: HTMLElement;
  render(panes: DockPane[]): void;
}

const HINT_KEY = "greenterm.agentHintHidden";

function hintHidden(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function stateText(a: Agent, now: number): string {
  const s = t();
  const label = {
    idle: s.agentIdle,
    working: s.agentWorking,
    permission: s.agentPermission,
    question: s.agentQuestion,
    waiting: s.agentWaiting,
    done: s.agentDone,
  }[a.state];
  return a.state === "working" ? `${label} ${formatUptime(now - a.since)}` : label;
}

function chip(pane: DockPane, a: Agent, onPick: (pty: number) => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `agent-chip ${markOf(a.state)}`;
  el.innerHTML =
    '<span class="agent-n"></span><span class="agent-dot"></span><span class="agent-name"></span>' +
    '<span class="agent-state"></span>';
  const [n, , name] = Array.from(el.children) as HTMLElement[];
  n.textContent = String(pane.number);
  name.textContent = pane.folder;
  const tips = [a.title, a.message];
  if (a.check?.state === "mismatch") {
    const warn = document.createElement("span");
    warn.className = "agent-warn";
    warn.textContent = `⚠ ${(a.check.actual ?? "?").replace(/^claude-/, "")}`;
    el.append(warn);
    tips.push(t().agentMismatch(a.check.selected ?? "?", a.check.actual ?? "?"));
  }
  el.title = tips.filter(Boolean).join("\n");
  el.addEventListener("click", () => onPick(pane.pty));
  return el;
}

export function createAgentDock(board: AgentBoard, clock: UptimeClock, onPick: (pty: number) => void): AgentDock {
  const el = document.createElement("footer");
  el.className = "agent-dock";
  el.hidden = true;
  const chips = document.createElement("div");
  chips.className = "agent-chips";
  const hint = document.createElement("span");
  hint.className = "agent-hint";
  const hintText = document.createElement("span");
  const hintClose = document.createElement("button");
  hintClose.type = "button";
  hintClose.textContent = "×";
  hint.append(hintText, hintClose);
  const fiveHour = createLimitMeter("5h", (left) => t().limitResets(left));
  const sevenDay = createLimitMeter("7d", (left) => t().limitResets(left));
  el.append(chips, hint, fiveHour.el, sevenDay.el);

  let panes: DockPane[] = [];
  let shown: { pty: number; agent: Agent; state: HTMLElement }[] = [];
  let stopClock: (() => void) | null = null;

  const tick = () => {
    const now = Date.now();
    shown.forEach(({ agent, state }) => (state.textContent = stateText(agent, now)));
    fiveHour.show(board.limits?.fiveHour ?? null, now / 1000);
    sevenDay.show(board.limits?.sevenDay ?? null, now / 1000);
  };

  const draw = () => {
    const live = panes.flatMap((pane) => {
      const agent = board.get(pane.pty);
      return agent ? [{ pane, agent }] : [];
    });
    const els = live.map(({ pane, agent }) => chip(pane, agent, onPick));
    shown = live.map(({ pane, agent }, i) => ({
      pty: pane.pty,
      agent,
      state: els[i].querySelector<HTMLElement>(".agent-state")!,
    }));
    chips.replaceChildren(...els);
    el.hidden = live.length === 0;
    hint.hidden = el.hidden || live.some(({ agent }) => agent.fromPlugin) || hintHidden();
    hintText.textContent = t().agentPluginHint;
    hintClose.setAttribute("aria-label", t().hide);
    tick();
    // The clock ticks only while the dock shows.
    if (!el.hidden && !stopClock) stopClock = clock.subscribe(tick);
    else if (el.hidden && stopClock) {
      stopClock();
      stopClock = null;
    }
  };

  hintClose.addEventListener("click", () => {
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    draw();
  });
  onLangChange(draw);

  return {
    el,
    render(next) {
      panes = next;
      draw();
    },
  };
}
