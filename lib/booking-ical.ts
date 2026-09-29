import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import ical, { type CalendarResponse, type DateWithTimeZone, type VEvent } from "node-ical";
import { addDays, dateInBelgrade } from "./dates";

// Booking.com iCal import. The export URL is a secret: it never goes to the
// browser, never into the Apartment type, never into a cache key and never into a log line.

export type BookingRange = {
  /** First booked night, 'YYYY-MM-DD'. */
  start: string;
  /** Exclusive, same meaning as check_out: this night is free again. */
  end: string;
};

/** Why reading the Booking calendar failed. Stable codes, meant for logs and the admin. */
export type BookingFailureCode =
  | "link-not-found" // HTTP 404/410: the link was changed or deleted on Booking
  | "access-denied" // HTTP 401/403: Booking refuses us (bot protection)
  | "too-many-requests" // HTTP 429
  | "booking-server-error" // HTTP 5xx
  | "http-error" // any other non-200 status
  | "not-ical" // status 200, but the body is not a calendar (usually an HTML page)
  | "parse-error" // looked like iCal, but node-ical could not read it
  | "timeout" // no answer in time
  | "connection-reset" // Booking closed the connection (ECONNRESET, "other side closed")
  | "connect-failed" // could not connect at all
  | "dns" // name lookup failed: usually our network, not Booking
  | "tls" // certificate / TLS problem
  | "network" // some other network error without a known code
  | "unknown";

/** `detail` holds only safe values: an HTTP status, a content type, a system error code. */
export type BookingFailure = { code: BookingFailureCode; detail: string };

/** Safe to log: the message never contains the export URL. */
export class BookingIcalError extends Error {
  readonly code: BookingFailureCode;
  readonly detail: string;

  constructor(slug: string, failure: BookingFailure) {
    super(`Booking calendar for "${slug}" is unavailable (${failure.code}: ${failure.detail})`);
    this.name = "BookingIcalError";
    this.code = failure.code;
    this.detail = failure.detail;
  }
}

const FETCH_TIMEOUT_MS = 10_000;
const CACHE_SECONDS = 600;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_000;
const USER_AGENT = "CantiApartmani-iCalSync/1.0";

/** Failures that are often gone a second later. A 404 or 403 will not fix itself. */
const RETRYABLE: ReadonlySet<BookingFailureCode> = new Set([
  "too-many-requests",
  "booking-server-error",
  "not-ical",
  "timeout",
  "connection-reset",
  "connect-failed",
  "dns",
  "network",
]);

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

// --- failure classification (pure) -----------------------------------------------

function httpFailure(status: number): BookingFailure {
  const detail = `HTTP ${status}`;
  if (status === 404 || status === 410) return { code: "link-not-found", detail };
  if (status === 401 || status === 403) return { code: "access-denied", detail };
  if (status === 429) return { code: "too-many-requests", detail };
  if (status >= 500) return { code: "booking-server-error", detail };
  return { code: "http-error", detail };
}

// System codes look like ECONNRESET or UND_ERR_SOCKET. Anything else is not trusted in a log.
const SAFE_CODE = /^[A-Z][A-Z0-9_]{1,40}$/;

function errorCode(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("code" in value)) return null;
  const { code } = value;
  return typeof code === "string" && SAFE_CODE.test(code) ? code : null;
}

/** fetch() hides the real reason in error.cause (sometimes an AggregateError: IPv4 + IPv6). */
function networkCode(error: Error): string | null {
  const { cause } = error;
  const candidates = [cause, ...(cause instanceof AggregateError ? cause.errors : [])];
  for (const candidate of candidates) {
    const code = errorCode(candidate);
    if (code) return code;
  }
  return null;
}

function networkFailureCode(code: string): BookingFailureCode {
  if (code === "ECONNRESET" || code === "EPIPE" || code === "UND_ERR_SOCKET") return "connection-reset";
  if (code === "ETIMEDOUT" || (code.startsWith("UND_ERR_") && code.endsWith("_TIMEOUT"))) return "timeout";
  if (code === "ECONNREFUSED" || code === "ENETUNREACH" || code === "EHOSTUNREACH") return "connect-failed";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "dns";
  if (/CERT|TLS|SSL/.test(code)) return "tls";
  return "network";
}

/** Turns anything thrown while reading Booking into a code + safe detail. Never reads error.message. */
export function classifyBookingError(error: unknown): BookingFailure {
  if (error instanceof BookingIcalError) return { code: error.code, detail: error.detail };
  if (!(error instanceof Error)) return { code: "unknown", detail: typeof error };
  // AbortSignal.timeout() rejects with a DOMException named TimeoutError.
  if (error.name === "TimeoutError" || error.name === "AbortError") return { code: "timeout", detail: error.name };

  const code = networkCode(error);
  if (code) return { code: networkFailureCode(code), detail: code };
  // fetch() throws a plain TypeError for network problems without a code.
  return { code: error.name === "TypeError" ? "network" : "unknown", detail: error.name };
}

// --- reading --------------------------------------------------------------------

type ReadMode = "cached" | "fresh";

// Last successful result per apartment (per server instance), shown when Booking is down.
const lastGood = new Map<string, BookingRange[]>();
const warnedMissingUrl = new Set<string>();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** One request. Always no-store: the raw answer is never cached, only a parsed calendar (see below). */
async function fetchIcs(slug: string, url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new BookingIcalError(slug, httpFailure(response.status));

  const text = await response.text();
  // Booking sometimes answers 200 with an HTML error page.
  if (!text.includes("BEGIN:VCALENDAR")) {
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "none";
    throw new BookingIcalError(slug, { code: "not-ical", detail: `${contentType}, ${text.length} bytes` });
  }
  return text;
}

function parseOrThrow(slug: string, icsText: string): BookingRange[] {
  try {
    return parseBookingIcal(icsText);
  } catch (error) {
    const detail = error instanceof Error ? error.name : typeof error;
    throw new BookingIcalError(slug, { code: "parse-error", detail });
  }
}

/** Up to MAX_ATTEMPTS requests. Every failed attempt is logged with its code; the URL never is. */
async function readBookingCalendar(slug: string, url: string, mode: ReadMode): Promise<BookingRange[]> {
  for (let attempt = 1; ; attempt++) {
    const startedAt = Date.now();
    try {
      const ranges = parseOrThrow(slug, await fetchIcs(slug, url));
      if (attempt > 1) console.warn(`[booking-ical] "${slug}" read on attempt ${attempt}/${MAX_ATTEMPTS} (${mode})`);
      return ranges;
    } catch (error) {
      const failure = classifyBookingError(error);
      const retry = attempt < MAX_ATTEMPTS && RETRYABLE.has(failure.code);
      console.error(
        `[booking-ical] "${slug}" failed: ${failure.code} (${failure.detail}), ` +
          `attempt ${attempt}/${MAX_ATTEMPTS}, ${mode}, ${Date.now() - startedAt} ms` +
          (retry ? ", retrying" : ""),
      );
      if (!retry) throw new BookingIcalError(slug, failure);
      await sleep(RETRY_DELAY_MS);
    }
  }
}

/** Short hash of the URL: a new link gets a new cache entry, and the URL itself stays out of the key. */
function urlFingerprint(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

/**
 * Only a parsed, valid calendar is cached. A failed read throws, and a thrown error is
 * never stored, so a bad answer from Booking cannot replace a good cached calendar.
 * After 10 minutes the stale calendar is served while a new one is read in the background.
 */
function readCachedBookingCalendar(slug: string, url: string): Promise<BookingRange[]> {
  return unstable_cache(() => readBookingCalendar(slug, url, "cached"), ["booking-ical", slug, urlFingerprint(url)], {
    revalidate: CACHE_SECONDS,
  })();
}

/**
 * Booked ranges from Booking.com for one apartment.
 * - default: cached for 10 minutes; if Booking fails, the last good result is used
 * - fresh: no cache and no fallback, for checking right before a reservation is saved
 * Throws BookingIcalError (with a failure code) when nothing usable is available.
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
    const ranges = fresh ? await readBookingCalendar(slug, url, "fresh") : await readCachedBookingCalendar(slug, url);
    lastGood.set(slug, ranges);
    return ranges;
  } catch (error) {
    const fallback = fresh ? undefined : lastGood.get(slug);
    if (fallback) {
      console.warn(`[booking-ical] "${slug}" is using the last good result`);
      return fallback;
    }
    throw error instanceof BookingIcalError ? error : new BookingIcalError(slug, classifyBookingError(error));
  }
}
