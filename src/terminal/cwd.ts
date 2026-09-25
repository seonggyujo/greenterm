import type { Terminal } from "@xterm/xterm";
import { createLogger } from "../app/log";

// Reads the current folder the shell reports with invisible OSC sequences:
//   OSC 9;9;<path>          Windows Terminal style (our shell hooks use it)
//   OSC 7;file://host/path  common on Unix-like shells
// The handlers consume the sequence; nothing is drawn. Shells report on
// every prompt, so only a new folder is passed on (and logged).

const log = createLogger("cwd");

/** MSYS / Git Bash path (/c/Users/me) to Windows form (C:\Users\me). */
function toWindowsPath(path: string): string {
  const msys = /^\/([a-zA-Z])(\/.*)?$/.exec(path);
  if (!msys) return path;
  return `${msys[1].toUpperCase()}:${(msys[2] ?? "\\").replace(/\//g, "\\")}`;
}

/** `name` labels the log line, e.g. "pty 3". */
export function watchCwd(term: Terminal, name: () => string, onChange: (path: string) => void): void {
  let last = "";
  const onCwd = (path: string) => {
    if (path === last) return;
    last = path;
    log.debug(`${name()} in ${path}`);
    onChange(path);
  };

  term.parser.registerOscHandler(9, (data) => {
    if (!data.startsWith("9;")) return false;
    const path = data.slice(2).replace(/^"|"$/g, "");
    if (path) onCwd(toWindowsPath(path));
    return true;
  });

  term.parser.registerOscHandler(7, (data) => {
    try {
      const path = decodeURIComponent(new URL(data).pathname);
      const win = path.replace(/^\/([a-zA-Z]:)/, "$1");
      if (/^[a-zA-Z]:/.test(win)) onCwd(win.replace(/\//g, "\\"));
      else if (win) onCwd(toWindowsPath(win));
    } catch {
      /* not a file:// URL */
    }
    return true;
  });
}
