import { SHELL_LABELS } from "../app/shells";
import type { ShellKind } from "../ipc/pty";
import { createPopover } from "./popover";

// Dropdown listing the installed shells. The current default has a check
// mark. Below them, "Web page" opens a web pane at once. Opening and
// closing is popover.ts; picking an item closes it too.

export interface ShellMenu {
  el: HTMLElement;
  toggle(anchor: HTMLElement): void;
  setDefault(shell: ShellKind): void;
}

function menuItem(role: string, mark: string, label: string, onClick: () => void): HTMLButtonElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "shell-menu-item";
  item.setAttribute("role", role);
  item.innerHTML = `<span class="shell-check">${mark}</span><span></span>`;
  item.lastElementChild!.textContent = label;
  item.addEventListener("click", onClick);
  return item;
}

export function createShellMenu(
  shells: ShellKind[],
  initial: ShellKind,
  onPick: (shell: ShellKind) => void,
  onWeb: () => void,
): ShellMenu {
  const el = document.createElement("div");
  el.className = "shell-menu";
  el.setAttribute("role", "menu");
  const popover = createPopover(el, "shell-menu");

  const items = shells.map((shell) => {
    const item = menuItem("menuitemradio", "✓", SHELL_LABELS[shell], () => {
      popover.close();
      onPick(shell);
    });
    item.dataset.shell = shell;
    return item;
  });
  const web = menuItem("menuitem", "+", "Web page", () => {
    popover.close();
    onWeb();
  });
  web.classList.add("shell-menu-web");
  el.append(...items, web);

  const setDefault = (shell: ShellKind) => {
    items.forEach((i) => i.setAttribute("aria-checked", String(i.dataset.shell === shell)));
  };
  setDefault(initial);

  return { el, toggle: popover.toggle, setDefault };
}
