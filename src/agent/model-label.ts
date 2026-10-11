// A model id the way the sidebar shows it (pure): "claude-opus-5-5" →
// "Opus 5.5", "claude-sonnet-5-5[1m]" → "Sonnet 5.5 1M", a dated id
// "claude-haiku-5-5-20260301" → "Haiku 5.5". An alias ("opus") or an id of
// another shape keeps its words, without the "claude-" in front.

const MODEL = /^(?:claude-)?([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?(\[1m\])?$/i;

const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export function modelLabel(id: string): string {
  const m = MODEL.exec(id);
  if (!m) return capital(id.replace(/^claude-/i, "").replace(/\[1m\]$/i, " 1M"));
  const [, family, major, minor, longContext] = m;
  return `${capital(family)} ${major}${minor ? `.${minor}` : ""}${longContext ? " 1M" : ""}`;
}
