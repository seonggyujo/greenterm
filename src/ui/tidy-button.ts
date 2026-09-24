// Title bar button that puts the panes back into the automatic grid. Shown
// only while the user's own arrangement is active. It sits left of the
// other controls, so showing it never moves them.

const LABEL = "Back to automatic grid";

const ICON =
  '<svg viewBox="0 0 14 14" aria-hidden="true">' +
  '<rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/>' +
  '<rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/>' +
  '<rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/>' +
  '<rect x="8" y="8" width="4.5" height="4.5" rx="1"/>' +
  "</svg>";

export interface TidyButton {
  el: HTMLButtonElement;
  setVisible(visible: boolean): void;
}

export function createTidyButton(onTidy: () => void): TidyButton {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "tb-button tb-icon tb-tidy";
  el.setAttribute("aria-label", LABEL);
  el.title = LABEL;
  el.innerHTML = ICON;
  el.hidden = true;
  el.addEventListener("click", onTidy);
  return {
    el,
    setVisible(visible) {
      el.hidden = !visible;
    },
  };
}
