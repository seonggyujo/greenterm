import { markOf, type Agent } from "../agent/agent-model";
import { formatUptime } from "../app/uptime-clock";
import { t } from "../i18n/lang";

// One row of the agent sidebar:
//   ● 1  heron        2m 14s
//        working
//        ⚠ sonnet-5
// Collapsed, only the dot and the pane number show; the tooltip says the rest.

export interface AgentRow {
  pty: number;
  /** 1-based position among the panes. */
  number: number;
  folder: string;
  agent: Agent;
}

export interface AgentItem {
  el: HTMLButtonElement;
  /** Updates the working time. */
  tick(now: number): void;
}

function stateText(a: Agent): string {
  const s = t();
  return {
    idle: s.agentIdle,
    working: s.agentWorking,
    permission: s.agentPermission,
    question: s.agentQuestion,
    waiting: s.agentWaiting,
    done: s.agentDone,
  }[a.state];
}

function span(className: string, text = ""): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}

export function createAgentItem(row: AgentRow, onPick: (pty: number) => void, onHover: (pty: number | null) => void): AgentItem {
  const { agent: a } = row;
  const el = document.createElement("button");
  el.type = "button";
  el.className = `agent-item ${markOf(a.state)}`;

  const time = span("agent-time");
  const top = span("agent-top");
  top.append(span("agent-name", row.folder), time);
  const body = span("agent-body");
  body.append(top, span("agent-line", stateText(a)));
  const tips = [`${row.number} · ${row.folder} · ${stateText(a)}`, a.title, a.message];
  if (a.check?.state === "mismatch") {
    body.append(span("agent-warn", `⚠ ${(a.check.actual ?? "?").replace(/^claude-/, "")}`));
    tips.push(t().agentMismatch(a.check.selected ?? "?", a.check.actual ?? "?"));
  }
  el.append(span("agent-dot"), span("agent-n", String(row.number)), body);
  el.title = tips.filter(Boolean).join("\n");

  el.addEventListener("click", () => onPick(row.pty));
  el.addEventListener("mouseenter", () => onHover(row.pty));
  el.addEventListener("mouseleave", () => onHover(null));

  return {
    el,
    tick(now) {
      time.textContent = a.state === "working" ? formatUptime(now - a.since) : "";
    },
  };
}
