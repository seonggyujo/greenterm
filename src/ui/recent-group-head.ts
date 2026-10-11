import type { SessionGroup } from "../agent/session-groups";
import { folderLabel } from "../app/paths";
import { timeAgo } from "../i18n/time-ago";

// The head of one folder in the recent sessions: an arrow, the folder name
// ("heron · fix-login" for a worktree), how many sessions it has and how
// long ago the newest ran. A click folds or unfolds the folder's sessions.

export function createGroupHead(group: SessionGroup, open: boolean, now: number, onToggle: () => void): HTMLElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "recent-group";
  el.setAttribute("aria-expanded", String(open));
  el.title = group.cwd;
  el.innerHTML =
    '<span class="recent-arrow" aria-hidden="true"></span><span class="recent-group-name"></span>' +
    '<span class="recent-count"></span><span class="recent-group-when"></span>';
  el.querySelector(".recent-arrow")!.textContent = open ? "▾" : "▸";
  el.querySelector(".recent-group-name")!.textContent = folderLabel(group.cwd) ?? group.cwd;
  el.querySelector(".recent-count")!.textContent = String(group.sessions.length);
  el.querySelector(".recent-group-when")!.textContent = timeAgo(group.modified, now);
  el.addEventListener("click", onToggle);
  return el;
}
