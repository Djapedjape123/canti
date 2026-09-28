import "server-only";
import ical, { type CalendarResponse, type DateWithTimeZone, type VEvent } from "node-ical";
import { addDays, dateInBelgrade } from "./dates";

// Booking.com iCal import. The export URL is a secret: it never goes to the
// browser, never into the Apartment type and never into a log line.

export type BookingRange = {
  /** First booked night, 'YYYY-MM-DD'. */
  start: string;
  /** Exclusive, same meaning as check_out: this night is free again. */
  end: string;
};

/** Safe to log: the message never contains the export URL. */
export class BookingIcalError extends Error {
  readonly reason: string;

  constructor(slug: string, reason: string) {
    super(`Booking calendar for "${slug}" is unavailable (${reason})`);
    this.name = "BookingIcalError";
    this.reason = reason;
  }
}

const FETCH_TIMEOUT_MS = 10_000;
const CACHE_SECONDS = 600;
const USER_AGENT = "CantiApartmani-iCalSync/1.0";

/**
 * node-ical turns DTSTART;VALUE=DATE:20261002 into LOCAL midnight with dateOnly = true.
 * East of UTC (Europe/Belgrade) toISOString() would give the previous day, so date-only
 * values are read from their local parts. Values with a time are real instants and are
 * converted to the calendar date in Belgrade.
 */
function icalDateToIso(date: DateWithTimeZone): string {
  if (date.dateOnly) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }
  return dateInBelgrade(date);
}

function isVEvent(component: CalendarResponse[string]): component is VEvent {
  return component?.type === "VEVENT";
}

/** Booked ranges from a Booking.com .ics export, sorted by start. Pure function. */
export function parseBookingIcal(icsText: string): BookingRange[] {
  const ranges: BookingRange[] = [];

  for (const component of Object.values(ical.sync.parseICS(icsText))) {
    if (!isVEvent(component) || !component.start) continue;

    const start = icalDateToIso(component.start);
    // DTEND is exclusive, exactly like check_out: no day is added or removed here.
    // node-ical already sets end = start + 1 day for a date-only event without DTEND;
    // the fallback below only keeps that rule if a future version stops doing it.
    const end = component.end
      ? icalDateToIso(component.end)
      : component.start.dateOnly
        ? addDays(start, 1)
        : start;

    if (end <= start) continue;
    ranges.push({ start, end });
  }

  return ranges.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

/** 'de-lux' → 'BOOKING_ICAL_URL_DE_LUX' */
export function bookingIcalEnvKey(slug: string): string {
  return `BOOKING_ICAL_URL_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

// TEMPORARY: moves to apartments.booking_ical_url once Supabase is connected.
export function getBookingIcalUrl(slug: string): string | null {
  return process.env[bookingIcalEnvKey(slug)] || null;
}

// Last successful result per apartment (per server instance), shown when Booking is down.
const lastGood = new Map<string, BookingRange[]>();
const warnedMissingUrl = new Set<string>();

async function fetchIcs(slug: string, url: string, fresh: boolean): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: CACHE_SECONDS } }),
  });
  if (!response.ok) throw new BookingIcalError(slug, `HTTP ${response.status}`);

  const text = await response.text();
  // Booking sometimes answers 200 with an HTML error page.
  if (!text.includes("BEGIN:VCALENDAR")) throw new BookingIcalError(slug, "not an iCal file");
  return text;
}

/** Only our own reason or the error name: a fetch error message can contain the URL. */
function safeReason(error: unknown): string {
  if (error instanceof BookingIcalError) return error.reason;
  return error instanceof Error ? error.name : "unknown error";
}

/**
 * Booked ranges from Booking.com for one apartment.
 * - default: cached for 10 minutes; if Booking fails, the last good result is used
 * - fresh: no cache and no fallback, for checking right before a reservation is saved
 * Throws BookingIcalError when nothing usable is available.
 */
export async function getBookingRanges(
  slug: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<BookingRange[]> {
  const url = getBookingIcalUrl(slug);
  if (!url) {
    if (!warnedMissingUrl.has(slug)) {
      warnedMissingUrl.add(slug);
      console.warn(`[booking-ical] ${bookingIcalEnvKey(slug)} is not set, "${slug}" has no Booking dates`);
    }
    return [];
  }

  try {
    const ranges = parseBookingIcal(await fetchIcs(slug, url, fresh));
    lastGood.set(slug, ranges);
    return ranges;
  } catch (error) {
    const reason = safeReason(error);
    const fallback = fresh ? undefined : lastGood.get(slug);
    console.error(
      `[booking-ical] Reading the Booking calendar for "${slug}" failed (${reason})` +
        (fallback ? ", using the last good result" : ""),
    );
    if (fallback) return fallback;
    throw new BookingIcalError(slug, reason);
  }
}
