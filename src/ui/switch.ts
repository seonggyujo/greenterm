// On/off switch for the settings panel.

export function createSwitch(label: string, initial: boolean, onChange: (on: boolean) => void): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "switch";
  el.setAttribute("role", "switch");
  el.setAttribute("aria-label", label);
  let on = initial;
  const render = () => el.setAttribute("aria-checked", String(on));
  el.addEventListener("click", () => {
    on = !on;
    render();
    onChange(on);
  });
  render();
  return el;
}
