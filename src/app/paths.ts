// Small path helpers shared by the pane and the agent dock.

/** Last folder of a Windows or Unix path: "C:\Users\me\app" → "app", "C:\" → "C:". */
export function folderName(path: string): string | null {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? null;
}
