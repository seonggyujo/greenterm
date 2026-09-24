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
  add.setAttribute("aria-label", "New terminal");
  add.textContent = "+";
  add.addEventListener("click", onAdd);

  const caption = document.createElement("p");
  caption.className = "empty-caption";
  caption.innerHTML = 'new terminal<span class="empty-cursor">_</span>';

  el.append(add, caption);
  return {
    el,
    setVisible(visible) {
      el.classList.toggle("visible", visible);
    },
  };
}
