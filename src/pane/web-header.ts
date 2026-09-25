import { toUrl } from "../web/to-url";

// Web pane header: status dot, "Web", back, reload, address box, page
// title, close. Same look as the terminal header (pane-header.ts).

export interface WebHeaderActions {
  onNavigate(url: string): void;
  onBack(): void;
  onReload(): void;
  onClose(): void;
}

export interface WebHeader {
  el: HTMLElement;
  setUrl(url: string): void;
  setTitle(title: string): void;
}

function button(className: string, label: string, text: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.setAttribute("aria-label", label);
  btn.textContent = text;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

export function createWebHeader(url: string, actions: WebHeaderActions): WebHeader {
  const el = document.createElement("header");
  el.className = "pane-header";

  const dot = document.createElement("span");
  dot.className = "pane-dot";
  const kind = document.createElement("span");
  kind.className = "pane-shell";
  kind.textContent = "Web";

  const back = button("web-nav", "Back", "‹", actions.onBack);
  const reload = button("web-nav", "Reload", "⟳", actions.onReload);

  let current = url;
  const address = document.createElement("input");
  address.className = "web-url";
  address.spellcheck = false;
  address.value = url;
  address.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && address.value.trim()) {
      actions.onNavigate(toUrl(address.value));
      address.blur();
    } else if (e.key === "Escape") {
      address.value = current;
      address.blur();
    }
  });
  address.addEventListener("focus", () => address.select());

  const title = document.createElement("span");
  title.className = "pane-title";
  const close = button("pane-close", "Close web page", "×", actions.onClose);

  el.append(dot, kind, back, reload, address, title, close);
  return {
    el,
    setUrl(next) {
      current = next;
      // Never overwrite what the user is typing.
      if (document.activeElement !== address) address.value = next;
    },
    setTitle(text) {
      title.textContent = text;
      title.title = text;
    },
  };
}
