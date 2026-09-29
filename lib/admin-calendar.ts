import { adminText } from "./admin-text";
import { daysInclusive, nightsBetween, nightsFromRanges, parseIsoDate } from "./dates";
import { plural } from "./plural";
import { MAX_PRICE, MIN_PRICE, priceForNight, type BasePrices, type PriceOverrides } from "./pricing";
import type { ReservationStatus } from "./supabase/types";

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
// Who holds each night (the colors of the days, blocking and unblocking)
// A day in this calendar stands for the night that starts on it.
// ---------------------------------------------------------------------------

/** Our statuses that hold dates (a cancelled reservation frees them). */
export type ActiveStatus = Exclude<ReservationStatus, "cancelled">;
/** Why a night is not free. */
export type NightStatus = "booking" | ActiveStatus;
/** { 'YYYY-MM-DD': status }. A free night has no entry. */
export type NightStatuses = Record<string, NightStatus>;
/** One of our reservations: only its dates and status, never guest data. */
export type OwnRange = { start: string; end: string; status: ActiveStatus };

/**
 * The status of every taken night in the loaded window.
 * When a night is both on Booking and ours, OUR status is shown: an old block
 * under a Booking stay must stay visible, so the owner can still unblock it
 * (else our iCal export would keep that night closed on Booking).
 */
export function nightStatuses(
  bookingRanges: readonly { start: string; end: string }[],
  ownRanges: readonly OwnRange[],
  loaded: LoadedWindow,
): NightStatuses {
  const statuses: NightStatuses = {};
  for (const night of nightsFromRanges(bookingRanges, loaded.from, loaded.until)) statuses[night] = "booking";
  // Our reservations never overlap each other (the EXCLUDE constraint), so the order does not matter.
  for (const range of ownRanges) {
    for (const night of nightsFromRanges([range], loaded.from, loaded.until)) statuses[night] = range.status;
  }
  return statuses;
}

/** How many picked days are in each state. Only today and later days are counted by status. */
export type RangeSummary = {
  free: number;
  booking: number;
  /** pending + confirmed: guests, changed only in the reservation list. */
  guests: number;
  blocked: number;
  /** Days before today: never blocked or unblocked. */
  past: number;
  /** Part of the range is outside the loaded months, so the counts are incomplete. */
  unknown: boolean;
};

export function rangeSummary(
  range: DayRange,
  statuses: NightStatuses,
  today: string,
  loaded: LoadedWindow,
): RangeSummary {
  const summary: RangeSummary = { free: 0, booking: 0, guests: 0, blocked: 0, past: 0, unknown: false };
  for (const day of daysInclusive(range.from, range.to)) {
    if (day < today) summary.past++;
    else if (day < loaded.from || day >= loaded.until) summary.unknown = true;
    else if (!Object.hasOwn(statuses, day)) summary.free++;
    else if (statuses[day] === "booking") summary.booking++;
    else if (statuses[day] === "blocked") summary.blocked++;
    else summary.guests++;
  }
  return summary;
}

/**
 * Which buttons make sense. Without full knowledge (`unknown`) both stay on
 * and the server decides; it checks everything again anyway.
 */
export function blockActions(summary: RangeSummary): { block: boolean; unblock: boolean } {
  return {
    block: summary.unknown || summary.free > 0,
    unblock: summary.unknown || summary.blocked > 0,
  };
}

// ---------------------------------------------------------------------------
// Labels (formatted in UTC, so the day never shifts)
// ---------------------------------------------------------------------------

/** 1 → "1 dan", 2 → "2 dana", 21 → "21 dan" */
export function daysLabel(count: number): string {
  const t = adminText.calendar;
  return plural("sr", count, { one: t.daysOne, few: t.daysFew, many: t.daysMany });
}

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
  const days = daysLabel(dayCount(range));
  const from = formatDayMonth(range.from);
  return range.from === range.to ? `${from} · ${days}` : `${from} – ${formatDayMonth(range.to)} · ${days}`;
}
