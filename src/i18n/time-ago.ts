import { getLang, t } from "./lang";

// How long ago a time was, in the app's language: "just now", "5 min. ago",
// "yesterday", "3일 전". Whole units, rounded down.

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["minute", 60],
  ["hour", 24],
  ["day", 30],
  ["month", 12],
];

export function timeAgo(ms: number, now: number): string {
  let amount = (now - ms) / 60_000;
  if (amount < 1) return t().justNow;
  const format = new Intl.RelativeTimeFormat(getLang(), { numeric: "auto", style: "short" });
  for (const [unit, size] of UNITS) {
    if (amount < size) return format.format(-Math.floor(amount), unit);
    amount /= size;
  }
  return format.format(-Math.floor(amount), "year");
}
