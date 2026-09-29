// All calendar-date arithmetic goes through here.
// Dates are 'YYYY-MM-DD' strings; internally we always use UTC midnight
// so the result never depends on the server's or browser's time zone.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = parseIsoDate(value);
  // Month 13 or day 32 give an invalid Date (toISOString would throw);
  // 2026-02-30 rolls over to 2 March, so the round trip does not match.
  return !Number.isNaN(date.getTime()) && toIsoDate(date) === value;
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

/** 0 = Sunday ... 5 = Friday, 6 = Saturday */
export function dayOfWeek(value: string): number {
  return parseIsoDate(value).getUTCDay();
}

/** Calendar date in Novi Sad at the given instant, regardless of where the code runs. */
export function dateInBelgrade(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "Today" as seen in Novi Sad. */
export function todayInBelgrade(now: Date = new Date()): string {
  return dateInBelgrade(now);
}

/** Number of nights between check-in and (exclusive) check-out. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = parseIsoDate(checkOut).getTime() - parseIsoDate(checkIn).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Every night covered by `ranges` inside [from, to), sorted, without duplicates.
 * Ranges are [start, end): the end date itself is free (check_out is exclusive).
 */
export function nightsFromRanges(
  ranges: readonly { start: string; end: string }[],
  from: string,
  to: string,
): string[] {
  const nights = new Set<string>();
  for (const range of ranges) {
    const first = range.start > from ? range.start : from;
    const end = range.end < to ? range.end : to;
    for (let night = first; night < end; night = addDays(night, 1)) nights.add(night);
  }
  return [...nights].sort();
}

/**
 * Every date from `from` to `to`, BOTH included. Only for the admin calendar,
 * where the owner picks days, not nights: 31.12 – 2.1 = 31.12, 1.1 and 2.1.
 * Empty when `to` is before `from`.
 */
export function daysInclusive(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

/**
 * Days of a month laid out for a Monday-first calendar grid.
 * Leading cells before the 1st are null. `month` is 1–12.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toIsoDate(new Date(Date.UTC(year, month - 1, day))));
  }
  return cells;
}
