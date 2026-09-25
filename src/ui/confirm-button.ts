// Button for actions that cannot be undone. The first click only asks
// ("Sure?"); a second click within CONFIRM_MS runs the action. The action
// returns a short result that shows on the button for a moment.

const CONFIRM_MS = 3000;
const RESULT_MS = 2000;

export function createConfirmButton(label: string, action: () => Promise<string>): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "tb-button settings-action";
  el.textContent = label;
  let timer = 0;

  const show = (text: string, confirm: boolean, ms: number) => {
    clearTimeout(timer);
    el.textContent = text;
    el.classList.toggle("confirm", confirm);
    timer = window.setTimeout(() => {
      timer = 0;
      el.textContent = label;
      el.classList.remove("confirm");
    }, ms);
  };

  el.addEventListener("click", async () => {
    if (!el.classList.contains("confirm")) return show("Sure?", true, CONFIRM_MS);
    el.disabled = true;
    const result = await action();
    el.disabled = false;
    show(result, false, RESULT_MS);
  });
  return el;
}
