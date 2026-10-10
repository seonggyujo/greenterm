import { onLangChange, t } from "../i18n/lang";

// "+ New agent" at the top of the agent sidebar: starts Claude Code in a new
// pane, in the selected pane's folder, whose name the button shows.
// Collapsed, only the "+" shows.

export interface NewAgentButton {
  el: HTMLButtonElement;
  /** Name of the folder a new agent starts in; null = the home folder. */
  setFolder(folder: string | null): void;
}

export function createNewAgentButton(onStart: () => void): NewAgentButton {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "new-agent";
  el.innerHTML = '<span class="new-agent-plus">+</span><span class="new-agent-label"></span><span class="new-agent-folder"></span>';
  const label = el.querySelector<HTMLElement>(".new-agent-label")!;
  const where = el.querySelector<HTMLElement>(".new-agent-folder")!;
  let folder: string | null = null;

  const draw = () => {
    label.textContent = t().newAgent;
    where.textContent = folder ?? "";
    el.title = t().newAgentIn(folder ?? "~");
    el.setAttribute("aria-label", el.title);
  };
  el.addEventListener("click", onStart);
  onLangChange(draw);
  draw();

  return {
    el,
    setFolder(next) {
      if (next === folder) return;
      folder = next;
      draw();
    },
  };
}
