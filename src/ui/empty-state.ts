import { onLangChange, t } from "../i18n/lang";

// Shown when no terminal is open: a large + button and a blinking cursor.

export interface EmptyState {
  el: HTMLElement;
  setVisible(visible: boolean): void;
}

export function createEmptyState(onAdd: () => void): EmptyState {
  const el = document.createElement("div");
  el.className = "empty-state";

  const add = document.createElement("button");
  add.type = "button";
  add.className = "empty-add";
  add.textContent = "+";
  add.addEventListener("click", onAdd);

  const caption = document.createElement("p");
  caption.className = "empty-caption";
  const text = document.createElement("span");
  const cursor = document.createElement("span");
  cursor.className = "empty-cursor";
  cursor.textContent = "_";
  caption.append(text, cursor);

  const showText = () => {
    add.setAttribute("aria-label", t().newTerminal);
    text.textContent = t().emptyCaption;
  };
  showText();
  onLangChange(showText);

  el.append(add, caption);
  return {
    el,
    setVisible(visible) {
      el.classList.toggle("visible", visible);
    },
  };
}
