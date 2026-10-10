import { t } from "../i18n/lang";
import { timeAgo } from "../i18n/time-ago";
import type { RecentSession } from "../ipc/sessions";

// One row of the recent sessions, under its folder's head: title and how
// long ago. Hovered, the time gives way to "Resume"; a click opens the session. A right click asks
// in the row whether to move the session to the Recycle Bin ([Delete]
// [Cancel]); Esc or a click elsewhere cancels. A failure shows in the row for
// a moment.

const RESULT_MS = 2500;

export interface SessionActions {
  open(session: RecentSession): void;
  /** Resolves to an error code ("running", ...), or null when it worked. */
  remove(session: RecentSession): Promise<string | null>;
}

export function createSessionRow(session: RecentSession, now: number, actions: SessionActions): HTMLElement {
  const el = document.createElement("div");
  el.className = "recent-item";
  el.innerHTML =
    '<button type="button" class="recent-main"><span class="recent-title"></span>' +
    '<span class="recent-when"></span><span class="recent-open"></span></button>' +
    '<div class="recent-ask" hidden><span class="recent-ask-text"></span><span class="recent-ask-buttons">' +
    '<button type="button" class="recent-ask-yes"></button><button type="button" class="recent-ask-no"></button></span></div>';
  const main = el.querySelector<HTMLButtonElement>(".recent-main")!;
  const ask = el.querySelector<HTMLElement>(".recent-ask")!;
  const askText = el.querySelector<HTMLElement>(".recent-ask-text")!;
  const yes = el.querySelector<HTMLButtonElement>(".recent-ask-yes")!;
  const no = el.querySelector<HTMLButtonElement>(".recent-ask-no")!;
  el.querySelector(".recent-when")!.textContent = timeAgo(session.modified, now);
  el.querySelector(".recent-open")!.textContent = `${t().resume} ↵`;
  el.querySelector(".recent-title")!.textContent = session.title;
  main.title = `${session.title}\n${session.cwd}\n${t().deleteHint}`;
  main.addEventListener("click", () => actions.open(session));

  const outside = (e: PointerEvent) => {
    if (!el.contains(e.target as Node)) close();
  };
  const close = () => {
    ask.hidden = true;
    el.classList.remove("asking");
    document.removeEventListener("pointerdown", outside, true);
  };
  const show = (text: string, choose: boolean) => {
    askText.textContent = text;
    yes.hidden = no.hidden = !choose;
    yes.textContent = t().deleteYes;
    no.textContent = t().deleteNo;
    ask.hidden = false;
    el.classList.add("asking");
  };

  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    show(t().deleteAsk, true);
    no.focus();
    document.addEventListener("pointerdown", outside, true);
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !ask.hidden) close();
  });
  no.addEventListener("click", close);
  yes.addEventListener("click", async () => {
    yes.disabled = no.disabled = true;
    const code = await actions.remove(session);
    yes.disabled = no.disabled = false;
    if (!code) return close();
    show(code === "running" ? t().deleteRunning : t().deleteFailed, false);
    window.setTimeout(close, RESULT_MS);
  });
  return el;
}
