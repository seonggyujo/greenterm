import { onLangChange, t } from "../i18n/lang";

// "+ New agent" at the top of the agent sidebar, a split button: the main
// part starts Claude Code in a new pane, in the selected pane's folder,
// whose name it shows; the ▾ opens the folder menu (agent-folder-menu.ts).
// Collapsed, only the "+" shows.

export interface NewAgentButton {
  el: HTMLElement;
  /** Name of the folder a new agent starts in; null = the home folder. */
  setFolder(folder: string | null): void;
}

export function createNewAgentButton(onStart: () => void, onMenu: (anchor: HTMLElement) => void): NewAgentButton {
  const el = document.createElement("div");
  el.className = "new-agent-group";
  const main = document.createElement("button");
  main.type = "button";
  main.className = "new-agent";
  main.innerHTML = '<span class="new-agent-plus">+</span><span class="new-agent-label"></span><span class="new-agent-folder"></span>';
  const label = main.querySelector<HTMLElement>(".new-agent-label")!;
  const where = main.querySelector<HTMLElement>(".new-agent-folder")!;
  const arrow = document.createElement("button");
  arrow.type = "button";
  arrow.className = "new-agent-arrow";
  arrow.setAttribute("aria-haspopup", "menu");
  arrow.textContent = "▾";
  el.append(main, arrow);
  let folder: string | null = null;

  const draw = () => {
    label.textContent = t().newAgent;
    where.textContent = folder ?? "";
    main.title = t().newAgentIn(folder ?? "~");
    main.setAttribute("aria-label", main.title);
    arrow.title = t().chooseAgentFolder;
    arrow.setAttribute("aria-label", arrow.title);
  };
  main.addEventListener("click", onStart);
  arrow.addEventListener("click", () => onMenu(el));
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
