// On/off switch for the settings panel. When the change can fail (a
// promise), the switch waits, disabled, and then shows the state the
// promise resolves to.

export function createSwitch(
  label: string,
  initial: boolean,
  onChange: (on: boolean) => void | Promise<boolean>,
): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "switch";
  el.setAttribute("role", "switch");
  el.setAttribute("aria-label", label);
  let on = initial;
  const render = () => el.setAttribute("aria-checked", String(on));
  el.addEventListener("click", async () => {
    on = !on;
    render();
    const result = onChange(on);
    if (!(result instanceof Promise)) return;
    el.disabled = true;
    on = await result;
    el.disabled = false;
    render();
  });
  render();
  return el;
}
