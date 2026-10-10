import { onLangChange, t } from "../i18n/lang";
import { createPopover } from "./popover";
import { buildRows, type SettingsActions } from "./settings-rows";

// Gear button in the title bar and the panel it opens. The rows
// (settings-rows.ts) are rebuilt on every open, after a reset and when the
// language changes while the panel is open.

const GEAR =
  '<svg viewBox="0 0 16 16" aria-hidden="true">' +
  '<circle cx="8" cy="8" r="2.2"/>' +
  '<path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>' +
  "</svg>";

export interface Settings {
  button: HTMLButtonElement;
  panel: HTMLElement;
}

export function createSettings(actions: SettingsActions): Settings {
  const panel = document.createElement("div");
  panel.className = "settings-panel";
  panel.setAttribute("role", "dialog");

  const title = document.createElement("div");
  title.className = "settings-title";

  const render = () => panel.replaceChildren(title, ...buildRows(withRefresh));
  const withRefresh: SettingsActions = {
    ...actions,
    onReset: () => {
      actions.onReset();
      // Let the Reset button show its result first, then redraw.
      setTimeout(render, 1200);
    },
  };

  const button = document.createElement("button");
  button.type = "button";
  button.className = "tb-button tb-icon tb-settings";
  button.setAttribute("aria-haspopup", "dialog");
  button.innerHTML = GEAR;

  const showText = () => {
    title.textContent = t().settings;
    panel.setAttribute("aria-label", t().settings);
    button.setAttribute("aria-label", t().settings);
    button.title = t().settings;
  };
  showText();
  onLangChange(() => {
    showText();
    if (panel.classList.contains("open")) render();
  });

  const popover = createPopover(panel, render);
  button.addEventListener("click", () => popover.toggle(button));
  return { button, panel };
}
