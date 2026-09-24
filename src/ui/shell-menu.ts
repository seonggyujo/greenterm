import { SHELL_LABELS } from "../app/shells";
import type { ShellKind } from "../ipc/pty";

// Dropdown listing the installed shells. The current default has a check
// mark. Closes on pick, outside click, Escape or window blur.

export interface ShellMenu {
  el: HTMLElement;
  toggle(anchor: HTMLElement): void;
  setDefault(shell: ShellKind): void;
}

export function createShellMenu(
  shells: ShellKind[],
  initial: ShellKind,
  onPick: (shell: ShellKind) => void,
): ShellMenu {
  const el = document.createElement("div");
  el.className = "shell-menu";
  el.setAttribute("role", "menu");

  const items = shells.map((shell) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "shell-menu-item";
    item.setAttribute("role", "menuitemradio");
    item.dataset.shell = shell;
    item.innerHTML = `<span class="shell-check">✓</span><span></span>`;
    item.lastElementChild!.textContent = SHELL_LABELS[shell];
    item.addEventListener("click", () => {
      close();
      onPick(shell);
    });
    return item;
  });
  el.append(...items);

  const setDefault = (shell: ShellKind) => {
    items.forEach((i) => i.setAttribute("aria-checked", String(i.dataset.shell === shell)));
  };
  setDefault(initial);

  const onOutside = (e: MouseEvent) => {
    if (!el.contains(e.target as Node)) close();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  function open(anchor: HTMLElement): void {
    const r = anchor.getBoundingClientRect();
    el.style.top = `${r.bottom + 6}px`;
    el.style.right = `${window.innerWidth - r.right}px`;
    el.classList.add("open");
    // Next tick, so the click that opened the menu does not close it.
    setTimeout(() => document.addEventListener("mousedown", onOutside));
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
  }

  function close(): void {
    el.classList.remove("open");
    document.removeEventListener("mousedown", onOutside);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("blur", close);
  }

  return {
    el,
    toggle: (anchor) => (el.classList.contains("open") ? close() : open(anchor)),
    setDefault,
  };
}
