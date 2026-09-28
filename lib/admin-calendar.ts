import { adminText } from "./admin-text";
import { daysInclusive, nightsBetween, parseIsoDate } from "./dates";
import { plural } from "./plural";
import { MAX_PRICE, MIN_PRICE, priceForNight, type BasePrices, type PriceOverrides } from "./pricing";

// Pure logic of the admin price calendar (app/admin/(panel)/kalendar).
// Here the owner picks DAYS, not nights, so a range includes both ends:
// 31.12 – 2.1 is three days (and three rows in price_overrides).

/** Serbian in Latin script. Plain "sr-RS" gives Cyrillic month names. */
const DATE_LOCALE = "sr-Latn-RS";

export type YearMonth = { year: number; month: number };
/** Picked days, `to` INCLUDED. */
export type DayRange = { from: string; to: string };
/** Days with loaded prices, `until` EXCLUDED (like the public calendar's window). */
export type LoadedWindow = { from: string; until: string };

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

/** "2026-12" → { year: 2026, month: 12 }; anything else (also a missing value) → null. */
export function parseYearMonth(value: unknown): YearMonth | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
}

export function formatYearMonth({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** '2026-12-31' → { year: 2026, month: 12 } */
export function yearMonthOf(date: string): YearMonth {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

export function addMonths({ year, month }: YearMonth, count: number): YearMonth {
  const index = year * 12 + (month - 1) + count;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function firstDayOf(yearMonth: YearMonth): string {
  return `${formatYearMonth(yearMonth)}-01`;
}

/**
 * The page loads prices for the month before, the month shown and the month
 * after, so a range across a month boundary (31.12 – 2.1) has known prices.
 */
export function loadedWindow(shown: YearMonth): LoadedWindow {
  return { from: firstDayOf(addMonths(shown, -1)), until: firstDayOf(addMonths(shown, 2)) };
}

// ---------------------------------------------------------------------------
// Picking days: tap the first day, then the last one (no dragging)
// ---------------------------------------------------------------------------

/** Only `start` = one tap so far; `start` + `end` = a finished range (end may equal start). */
export type DaySelection = { start: string | null; end: string | null };

export const NO_SELECTION: DaySelection = { start: null, end: null };

/**
 * First tap: that day. Second tap: a range in either direction (the same day
 * again keeps one day). Any tap after a finished range starts a new one.
 */
export function nextDaySelection(current: DaySelection, day: string): DaySelection {
  if (current.start === null || current.end !== null) return { start: day, end: null };
  return day < current.start ? { start: day, end: current.start } : { start: current.start, end: day };
}

/** The days the editor works on. After the first tap this is already that one day. */
export function selectedRange(selection: DaySelection): DayRange | null {
  if (selection.start === null) return null;
  return { from: selection.start, to: selection.end ?? selection.start };
}

export function isInRange(day: string, range: DayRange | null): boolean {
  return range !== null && day >= range.from && day <= range.to;
}

export function dayCount(range: DayRange): number {
  return nightsBetween(range.from, range.to) + 1;
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

/**
 * The price every day of the range has right now, to prefill the input.
 * null when the days differ, or when a day is outside the loaded window
 * (its price is not known on this page).
 */
export function commonPrice(
  range: DayRange,
  base: BasePrices,
  overrides: PriceOverrides,
  loaded: LoadedWindow,
): number | null {
  if (range.from < loaded.from || range.to >= loaded.until) return null;
  let common: number | null = null;
  for (const day of daysInclusive(range.from, range.to)) {
    const price = priceForNight(day, base, overrides);
    if (common === null) common = price;
    else if (price !== common) return null;
  }
  return common;
}

/** What the owner typed: "120", " 120 €" → 120. Whole euros only, else null. */
export function parsePriceInput(text: string): number | null {
  const digits = text.replace(/\s|€/g, "");
  if (!/^\d{1,5}$/.test(digits)) return null;
  const price = Number(digits);
  return price >= MIN_PRICE && price <= MAX_PRICE ? price : null;
}

// ---------------------------------------------------------------------------
// Labels (formatted in UTC, so the day never shifts)
// ---------------------------------------------------------------------------

const dayMonthFormat = new Intl.DateTimeFormat(DATE_LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const longDateFormat = new Intl.DateTimeFormat(DATE_LOCALE, { dateStyle: "full", timeZone: "UTC" });
const monthNameFormat = new Intl.DateTimeFormat(DATE_LOCALE, { month: "long", timeZone: "UTC" });

/** '2026-12-31' → "31. dec" */
export function formatDayMonth(date: string): string {
  return dayMonthFormat.format(parseIsoDate(date));
}

/** '2026-12-31' → "četvrtak, 31. decembar 2026." (for screen readers) */
export function formatLongDate(date: string): string {
  return longDateFormat.format(parseIsoDate(date));
}

/** { 2026, 12 } → "Decembar 2026" */
export function formatMonthTitle({ year, month }: YearMonth): string {
  const name = monthNameFormat.format(new Date(Date.UTC(year, month - 1, 1)));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

/** "31. dec – 2. jan · 3 dana", or "31. dec · 1 dan" for a single day. */
export function rangeLabel(range: DayRange): string {
  const t = adminText.calendar;
  const days = plural("sr", dayCount(range), { one: t.daysOne, few: t.daysFew, many: t.daysMany });
  const from = formatDayMonth(range.from);
  return range.from === range.to ? `${from} · ${days}` : `${from} – ${formatDayMonth(range.to)} · ${days}`;
}
