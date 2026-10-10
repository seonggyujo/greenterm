import { clampFontSize, FONT_MAX, FONT_MIN } from "../app/font-size";
import { t } from "../i18n/lang";

// A− [14] A+ buttons in the settings panel. Owns no state beyond what it
// shows; the caller applies and persists the size.

export function createFontSizeControl(
  initial: number,
  onChange: (px: number) => void,
): HTMLElement {
  let size = initial;

  const el = document.createElement("div");
  el.className = "tb-group";
  el.setAttribute("role", "group");
  el.setAttribute("aria-label", t().fontSize);

  const smaller = button("A−", t().fontSmaller, "tb-font-small");
  const value = document.createElement("span");
  value.className = "tb-font-value";
  const larger = button("A+", t().fontLarger, "tb-font-large");
  el.append(smaller, value, larger);

  const render = () => {
    value.textContent = String(size);
    smaller.disabled = size <= FONT_MIN;
    larger.disabled = size >= FONT_MAX;
  };
  const step = (delta: number) => {
    const next = clampFontSize(size + delta);
    if (next === size) return;
    size = next;
    render();
    onChange(size);
  };

  smaller.addEventListener("click", () => step(-1));
  larger.addEventListener("click", () => step(1));
  render();
  return el;
}

function button(text: string, label: string, cls: string): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `tb-button tb-icon ${cls}`;
  b.textContent = text;
  b.setAttribute("aria-label", label);
  return b;
}
