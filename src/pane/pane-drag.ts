import { createLogger } from "../app/log";
import { setOverlay } from "../app/overlay";
import { setBox } from "../layout/box-style";
import { previewBox, zoneAt, type Zone } from "../layout/drop-zone";
import type { PaneItem as Pane } from "./pane-item";

// Drag a pane by its header and drop it on another pane: near an edge it
// splits that pane on that side, in the middle the two swap places. A
// translucent box shows where the pane will go; Esc cancels. Pointer
// events, not HTML5 drag and drop: Tauri's native file drop turns that off
// in the webview. The header keeps the pointer captured, so the terminals
// underneath never start a text selection. Web pages are native views
// above the app page, so they hide while a drag is on (app/overlay.ts).

const log = createLogger("pane-drag");

/** Pointer travel in px before a press on the header becomes a drag. */
const THRESHOLD = 5;

export interface DropHost {
  readonly workspace: HTMLElement;
  paneAt(x: number, y: number): Pane | undefined;
  drop(source: Pane, target: Pane, zone: Zone): void;
}

interface Drop {
  target: Pane;
  zone: Zone;
}

export function attachPaneDrag(pane: Pane, host: DropHost): void {
  const handle = pane.handle;

  handle.addEventListener("pointerdown", (down) => {
    if (down.button !== 0 || (down.target as Element).closest("button, input")) return;
    handle.setPointerCapture(down.pointerId);
    let preview: HTMLElement | null = null;
    let drop: Drop | null = null;

    const begin = (): HTMLElement => {
      const el = document.createElement("div");
      el.className = "drop-preview";
      host.workspace.append(el);
      pane.el.classList.add("dragging");
      document.body.classList.add("pane-dragging");
      setOverlay("pane-drag", true);
      window.addEventListener("keydown", cancelKey, true);
      log.debug(`dragging ${pane.name}`);
      return el;
    };

    const track = (e: PointerEvent) => {
      if (!preview) {
        if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < THRESHOLD) return;
        preview = begin();
      }
      const target = host.paneAt(e.clientX, e.clientY);
      drop = null;
      if (target && target !== pane) {
        const r = target.el.getBoundingClientRect();
        const zone = zoneAt({ x: r.left, y: r.top, w: r.width, h: r.height }, e.clientX, e.clientY);
        drop = { target, zone };
        const el = target.el;
        setBox(preview, previewBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }, zone));
        preview.classList.toggle("swap", zone === "center");
      }
      preview.classList.toggle("visible", drop !== null);
    };

    // Esc must not reach the shell while dragging.
    function cancelKey(e: KeyboardEvent): void {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      drop = null;
      handle.releasePointerCapture(down.pointerId);
    }

    const cancel = () => {
      drop = null;
    };

    // Runs after pointerup, pointercancel and Esc alike.
    const end = () => {
      handle.removeEventListener("pointermove", track);
      handle.removeEventListener("pointercancel", cancel);
      handle.removeEventListener("lostpointercapture", end);
      window.removeEventListener("keydown", cancelKey, true);
      if (!preview) return;
      preview.remove();
      pane.el.classList.remove("dragging");
      document.body.classList.remove("pane-dragging");
      setOverlay("pane-drag", false);
      if (!drop) {
        log.debug(`drag of ${pane.name} cancelled`);
        return;
      }
      log.info(`dropped ${pane.name} on ${drop.target.name} (${drop.zone})`);
      host.drop(pane, drop.target, drop.zone);
    };

    handle.addEventListener("pointermove", track);
    handle.addEventListener("pointercancel", cancel);
    handle.addEventListener("lostpointercapture", end);
  });
}
