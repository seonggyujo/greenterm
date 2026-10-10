import { onLangChange, t } from "../i18n/lang";

// Split button: [+ New terminal <shell>][▾]. The main part opens the selected
// shell, the arrow opens the shell menu (which only selects).

export interface NewTerminalButton {
  el: HTMLElement;
  setShell(label: string): void;
}

export function createNewTerminalButton(
  shellLabel: string,
  onNew: () => void,
  onMenu: (anchor: HTMLElement) => void,
): NewTerminalButton {
  const group = document.createElement("div");
  group.className = "tb-group";

  const main = document.createElement("button");
  main.type = "button";
  main.className = "tb-button tb-primary";
  main.innerHTML = '<span class="tb-plus">+</span> <span class="tb-label"></span> <span class="tb-shell"></span>';
  const label = main.querySelector<HTMLElement>(".tb-label")!;
  const shell = main.querySelector<HTMLElement>(".tb-shell")!;
  shell.textContent = shellLabel;
  main.addEventListener("click", onNew);

  const arrow = document.createElement("button");
  arrow.type = "button";
  arrow.className = "tb-button tb-primary tb-arrow";
  arrow.setAttribute("aria-haspopup", "menu");
  arrow.textContent = "▾";
  arrow.addEventListener("click", () => onMenu(group));

  const showText = () => {
    label.textContent = t().newTerminal;
    arrow.setAttribute("aria-label", t().chooseShell);
  };
  showText();
  onLangChange(showText);

  group.append(main, arrow);
  return {
    el: group,
    setShell: (text) => {
      shell.textContent = text;
    },
  };
}
