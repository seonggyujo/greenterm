// Pane header DOM: status dot, shell name, exit badge, current folder,
// terminal title, uptime, close button. Status lives here, never inside the
// terminal: the terminal shows only what the shell prints.

export interface PaneHeader {
  el: HTMLElement;
  /** Title set by the running program (OSC 0/2). */
  setTitle(title: string): void;
  /** Current folder reported by the shell. */
  setCwd(path: string): void;
  setUptime(text: string): void;
  /** Shows the exit code, or a start failure when `code` is null. */
  showExit(code: number | null): void;
}

function span(className: string, text = ""): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}

/** Updates text only when it changed, and mirrors it into the tooltip. */
function setText(el: HTMLElement, text: string): void {
  if (el.textContent === text) return;
  el.textContent = text;
  el.title = text;
}

export function createPaneHeader(shellLabel: string, onClose: () => void): PaneHeader {
  const el = document.createElement("header");
  el.className = "pane-header";

  const dot = span("pane-dot");
  const shell = span("pane-shell", shellLabel);
  const exit = span("pane-exit");
  const cwd = span("pane-cwd");
  const title = span("pane-title");
  const uptime = span("pane-uptime");

  const close = document.createElement("button");
  close.type = "button";
  close.className = "pane-close";
  close.setAttribute("aria-label", "Close terminal");
  close.textContent = "×";
  close.addEventListener("click", (e) => {
    e.stopPropagation();
    onClose();
  });

  el.append(dot, shell, exit, cwd, title, uptime, close);
  return {
    el,
    setTitle: (text) => setText(title, text),
    setCwd: (path) => setText(cwd, path),
    setUptime: (text) => {
      if (uptime.textContent !== text) uptime.textContent = text;
    },
    showExit(code) {
      exit.textContent = code === null ? "failed to start" : `exit ${code}`;
      exit.classList.toggle("error", code !== 0);
    },
  };
}
