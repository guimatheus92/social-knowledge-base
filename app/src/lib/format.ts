import { formatDistanceToNow } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import type { Locale } from "@/i18n/dictionary";

const intlLocale = (l: Locale): string => (l === "en" ? "en-US" : "pt-BR");
const dfnsLocale = (l: Locale) => (l === "en" ? enUS : ptBR);

export function formatBytes(bytes: number | null | undefined): string {
  const b = bytes ?? 0;
  if (b < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  const v = b / Math.pow(1024, i);
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Capitalize the first letter (keeps the rest as typed). Empty string stays empty. */
export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** h:mm:ss or m:ss */
export function formatDuration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.floor(seconds ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Localized "2 hours ago". Returns null when there's no date (caller shows "never"). */
export function formatRelativeTime(
  iso: string | null | undefined,
  locale: Locale = "pt",
): string | null {
  if (!iso) return null;
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: dfnsLocale(locale) });
  } catch {
    return "—";
  }
}

export function formatDateTime(iso: string | null | undefined, locale: Locale = "pt"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(intlLocale(locale));
  } catch {
    return "—";
  }
}

/** ETA given remaining items and rate (items/sec). */
export function formatEta(remaining: number, ratePerSec: number): string {
  if (ratePerSec <= 0 || remaining <= 0) return "—";
  return formatDuration(remaining / ratePerSec);
}

export function formatNumber(n: number, locale: Locale = "pt"): string {
  return n.toLocaleString(intlLocale(locale));
}
