/**
 * Utility formatters. Business timezone is Europe/London everywhere.
 */

const LONDON = "Europe/London";

export function formatDateLondon(dateStr: string): string {
  // dateStr is YYYY-MM-DD (a date, not a timestamptz). Parse as UTC noon so
  // the tz shift can't push it into the neighbouring day.
  const d = new Date(`${dateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: LONDON,
  }).format(d);
}

export function formatTime(time: string): string {
  // time is "HH:MM:SS" or "HH:MM"; return "HH:MM".
  return time.slice(0, 5);
}

export function todayLondonISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
