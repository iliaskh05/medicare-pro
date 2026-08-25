/** Dates locales du centre (Africa/Casablanca) — éviter toISOString().slice UTC. */

export const CENTRE_TIMEZONE = "Africa/Casablanca";

const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: CENTRE_TIMEZONE,
});

const shortTime = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: CENTRE_TIMEZONE,
});

const dateKeyParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: CENTRE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD in centre TZ (not UTC). */
export function toLocalDateKey(date: Date = new Date()): string {
  return dateKeyParts.format(date);
}

export function parseLocalDateKey(key: string): Date {
  const parts = key.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDaysToKey(key: string, days: number): string {
  const d = parseLocalDateKey(key);
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}

export function startOfWeekKey(key: string): string {
  const d = parseLocalDateKey(key);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDateKey(d);
}

/** Ex. « Lundi 10 août 2026 ». */
export function formatFrenchDate(date: Date = new Date()): string {
  const label = longDate.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatFrenchTime(date: Date = new Date()): string {
  return shortTime.format(date);
}

export function formatCentreDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return `${toLocalDateKey(d)} ${formatFrenchTime(d)}`;
}
