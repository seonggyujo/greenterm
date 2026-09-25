// Typed text to a URL: kept as is when it has http(s)://, a bare host
// (no spaces, has a dot) gets https://, anything else becomes a search.

export function toUrl(text: string): string {
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (!/\s/.test(t) && t.includes(".")) return `https://${t}`;
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
}
