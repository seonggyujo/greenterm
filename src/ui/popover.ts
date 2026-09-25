import { setOverlay } from "../app/overlay";

// Open/close for a panel under a title bar button: opens below the anchor,
// right edges aligned; closes on outside click, Escape, window blur, or
// another click on the button that opened it ([aria-haspopup] inside the
// anchor).
// While open it counts as an overlay, so web panes step aside
// (app/overlay.ts).

export interface Popover {
  toggle(anchor: HTMLElement): void;
  close(): void;
}

/** `onOpen` runs right before the panel shows, e.g. to refresh it. */
export function createPopover(el: HTMLElement, name: string, onOpen?: () => void): Popover {
  let anchorEl: HTMLElement | null = null;
  const onOutside = (e: MouseEvent) => {
    const target = e.target as Element;
    if (el.contains(target)) return;
    // A press on the button that opened the panel is left to its own
    // click, which toggles the panel shut. Closing here as well would
    // make that click open it again.
    const trigger = target.closest("[aria-haspopup]");
    if (trigger && anchorEl?.contains(trigger)) return;
    close();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  function open(anchor: HTMLElement): void {
    anchorEl = anchor;
    onOpen?.();
    const r = anchor.getBoundingClientRect();
    el.style.top = `${r.bottom + 6}px`;
    el.style.right = `${window.innerWidth - r.right}px`;
    el.classList.add("open");
    setOverlay(name, true);
    // Next tick, so the click that opened the panel does not close it.
    setTimeout(() => document.addEventListener("mousedown", onOutside));
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
  }

  function close(): void {
    el.classList.remove("open");
    setOverlay(name, false);
    document.removeEventListener("mousedown", onOutside);
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("blur", close);
  }

  return {
    toggle: (anchor) => (el.classList.contains("open") ? close() : open(anchor)),
    close,
  };
}
