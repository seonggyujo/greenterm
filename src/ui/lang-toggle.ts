import type { Lang } from "../i18n/lang";

// Language choice in the settings panel. Each language is named in itself,
// so it can be found whatever the current language is.

const LANGS: { id: Lang; name: string }[] = [
  { id: "en", name: "English" },
  { id: "ko", name: "한국어" },
];

export function createLangToggle(initial: Lang, label: string, onChange: (lang: Lang) => void): HTMLElement {
  const el = document.createElement("div");
  el.className = "tb-group lang-toggle";
  el.setAttribute("role", "radiogroup");
  el.setAttribute("aria-label", label);

  let selected = initial;
  const buttons = LANGS.map(({ id, name }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tb-button";
    b.setAttribute("role", "radio");
    b.lang = id;
    b.textContent = name;
    b.addEventListener("click", () => {
      if (id === selected) return;
      selected = id;
      render();
      onChange(id);
    });
    return b;
  });
  el.append(...buttons);

  function render(): void {
    buttons.forEach((b, i) => b.setAttribute("aria-checked", String(LANGS[i].id === selected)));
  }

  render();
  return el;
}
