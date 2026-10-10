import { folderKey, groupByFolder } from "../agent/session-groups";
import { foldedSessionGroupsPref } from "../app/prefs";
import { onLangChange, t } from "../i18n/lang";
import type { RecentSession } from "../ipc/sessions";
import { createGroupHead } from "./recent-group-head";
import { createSessionRow, type SessionActions } from "./recent-session-row";

// "Recent sessions" in the agent sidebar: Claude Code sessions of this PC,
// grouped by folder (agent/session-groups.ts), oldest at the top and newest
// at the bottom, scrolled to the newest. A folder folds and unfolds from its
// head (recent-group-head.ts); folded folders are remembered. Rows:
// recent-session-row.ts. The list scrolls with the wheel and has no
// scrollbar: a faded edge says how many sessions are out of sight.

export interface RecentSessions {
  el: HTMLElement;
  render(sessions: RecentSession[]): void;
}

export function createRecentSessions(actions: SessionActions): RecentSessions {
  const el = document.createElement("section");
  el.className = "recent-sessions";
  el.innerHTML =
    '<div class="recent-head"><span class="sidebar-title"></span><span class="recent-hint"></span></div>' +
    '<div class="recent-body"><div class="recent-list"></div>' +
    '<div class="recent-more up"></div><div class="recent-more down"></div></div>';
  const title = el.querySelector<HTMLElement>(".sidebar-title")!;
  const hint = el.querySelector<HTMLElement>(".recent-hint")!;
  const list = el.querySelector<HTMLElement>(".recent-list")!;
  const up = el.querySelector<HTMLElement>(".recent-more.up")!;
  const down = el.querySelector<HTMLElement>(".recent-more.down")!;
  let sessions: RecentSession[] = [];

  const showMore = () => {
    const rows = [...list.querySelectorAll<HTMLElement>(".recent-item")];
    const top = list.scrollTop;
    const bottom = top + list.clientHeight;
    const above = rows.filter((r) => r.offsetTop < top - 1).length;
    const below = rows.filter((r) => r.offsetTop + r.offsetHeight > bottom + 1).length;
    up.hidden = above === 0;
    up.textContent = t().moreAbove(above);
    down.hidden = below === 0;
    down.textContent = t().moreBelow(below);
  };

  const toggle = (key: string) => {
    const folded = foldedSessionGroupsPref.get();
    foldedSessionGroupsPref.set(folded.includes(key) ? folded.filter((k) => k !== key) : [...folded, key]);
    draw();
  };

  const draw = () => {
    title.textContent = t().recentSessions;
    hint.textContent = t().recentHint;
    el.hidden = sessions.length === 0;
    const now = Date.now();
    const folded = new Set(foldedSessionGroupsPref.get());
    const nodes = groupByFolder(sessions).flatMap((group) => {
      const key = folderKey(group.cwd);
      const open = !folded.has(key);
      const head = createGroupHead(group, open, now, () => toggle(key));
      return open ? [head, ...group.sessions.map((s) => createSessionRow(s, now, actions))] : [head];
    });
    // Stay with the newest unless the user scrolled up (to fold or delete there).
    const atNewest = list.scrollTop + list.clientHeight >= list.scrollHeight - 2;
    const scrolled = list.scrollTop;
    list.replaceChildren(...nodes);
    list.scrollTop = atNewest ? list.scrollHeight : scrolled;
    showMore();
  };
  list.addEventListener("scroll", showMore, { passive: true });
  new ResizeObserver(showMore).observe(list);
  onLangChange(draw);

  return {
    el,
    render(next) {
      sessions = next;
      draw();
    },
  };
}
