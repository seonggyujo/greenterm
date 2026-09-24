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
  main.innerHTML = '<span class="tb-plus">+</span> New terminal <span class="tb-shell"></span>';
  const shell = main.querySelector<HTMLElement>(".tb-shell")!;
  shell.textContent = shellLabel;
  main.addEventListener("click", onNew);

  const arrow = document.createElement("button");
  arrow.type = "button";
  arrow.className = "tb-button tb-primary tb-arrow";
  arrow.setAttribute("aria-label", "Choose shell");
  arrow.setAttribute("aria-haspopup", "menu");
  arrow.textContent = "▾";
  arrow.addEventListener("click", () => onMenu(group));

  group.append(main, arrow);
  return {
    el: group,
    setShell: (label) => {
      shell.textContent = label;
    },
  };
}
