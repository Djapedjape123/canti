import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { bookingIcalEnvKey, parseBookingIcal, type BookingRange } from "@/lib/booking-ical";
import { isIsoDate } from "@/lib/dates";

// --- helpers -----------------------------------------------------------------

function calendar(...components: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//admin.booking.com//h2cal//EN",
    "CALSCALE:GREGORIAN",
    ...components,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function vevent(uid: string, dtstart: string, dtend?: string): string {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@booking.com`,
    "DTSTAMP:20260928T100000Z",
    dtstart,
    ...(dtend ? [dtend] : []),
    "SUMMARY:CLOSED - Not available",
    "END:VEVENT",
  ].join("\r\n");
}

/** node-ical reads date-only values in the process time zone, so every test runs in several. */
function inTimeZone<T>(tz: string, fn: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

// [zone, getTimezoneOffset() on 1 Jan 2026] — the offset proves the switch really happened.
const ZONES: [string, number][] = [
  ["UTC", 0],
  ["Europe/Belgrade", -60],
  ["America/Los_Angeles", 480],
  ["Pacific/Auckland", -780],
];

// --- parseBookingIcal ----------------------------------------------------------

const SAMPLE = calendar(
  vevent("three-nights", "DTSTART;VALUE=DATE:20261002", "DTEND;VALUE=DATE:20261005"),
  vevent("month-change", "DTSTART;VALUE=DATE:20261030", "DTEND;VALUE=DATE:20261102"),
  vevent("one-night", "DTSTART;VALUE=DATE:20261114", "DTEND;VALUE=DATE:20261115"),
  vevent("no-dtend", "DTSTART;VALUE=DATE:20261231"),
  vevent("empty", "DTSTART;VALUE=DATE:20261125", "DTEND;VALUE=DATE:20261125"),
  // 23:00 UTC on 24 Oct = 01:00 on 25 Oct in Belgrade; winter time starts that night.
  vevent("with-time", "DTSTART:20261024T230000Z", "DTEND:20261026T090000Z"),
  ["BEGIN:VTODO", "UID:todo@booking.com", "DTSTART;VALUE=DATE:20261120", "SUMMARY:Not an event", "END:VTODO"].join(
    "\r\n",
  ),
);

const EXPECTED: BookingRange[] = [
  { start: "2026-10-02", end: "2026-10-05" },
  { start: "2026-10-25", end: "2026-10-26" },
  { start: "2026-10-30", end: "2026-11-02" },
  { start: "2026-11-14", end: "2026-11-15" },
  { start: "2026-12-31", end: "2027-01-01" },
];

describe.each(ZONES)("parseBookingIcal with TZ=%s", (tz, offset) => {
  const parse = (text: string) => inTimeZone(tz, () => parseBookingIcal(text));

  it("really runs in that time zone", () => {
    expect(inTimeZone(tz, () => new Date(2026, 0, 1).getTimezoneOffset())).toBe(offset);
  });

  it("returns exactly the dates written in the file", () => {
    expect(parse(SAMPLE)).toEqual(EXPECTED);
  });

  it("keeps DTEND exclusive (3 nights: 2, 3 and 4 Oct)", () => {
    expect(parse(SAMPLE)).toContainEqual({ start: "2026-10-02", end: "2026-10-05" });
  });

  it("handles a stay across the end of the month", () => {
    expect(parse(SAMPLE)).toContainEqual({ start: "2026-10-30", end: "2026-11-02" });
  });

  it("handles a single night", () => {
    expect(parse(SAMPLE)).toContainEqual({ start: "2026-11-14", end: "2026-11-15" });
  });

  it("treats a date-only event without DTEND as one night", () => {
    expect(parse(SAMPLE)).toContainEqual({ start: "2026-12-31", end: "2027-01-01" });
  });

  it("ignores components that are not VEVENT", () => {
    expect(parse(SAMPLE).some((range) => range.start === "2026-11-20")).toBe(false);
  });

  it("ignores events where DTEND is not after DTSTART", () => {
    expect(parse(SAMPLE).some((range) => range.start === "2026-11-25")).toBe(false);
  });

  it("converts events with a time to the Belgrade calendar date", () => {
    expect(parse(SAMPLE)).toContainEqual({ start: "2026-10-25", end: "2026-10-26" });
  });

  it("returns an empty list for a calendar without events", () => {
    expect(parse(calendar())).toEqual([]);
  });
});

// --- real export (fixtures/booking-sample.ics is not in git) ---------------------

const FIXTURE = fileURLToPath(new URL("../fixtures/booking-sample.ics", import.meta.url));

function rawDate(block: string, property: "DTSTART" | "DTEND"): string | null {
  const match = new RegExp(`${property};VALUE=DATE:(\\d{4})(\\d{2})(\\d{2})`).exec(block);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

describe("fixtures/booking-sample.ics", () => {
  it.skipIf(!existsSync(FIXTURE))("matches the raw DTSTART/DTEND values in every time zone", () => {
    const text = readFileSync(FIXTURE, "utf8");

    // What the file literally says, read with a regex instead of node-ical.
    const expected = [...text.matchAll(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)]
      .map(([block]) => ({ start: rawDate(block, "DTSTART"), end: rawDate(block, "DTEND") }))
      .filter((range): range is BookingRange => range.start !== null && range.end !== null)
      .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

    for (const [tz] of ZONES) {
      const ranges = inTimeZone(tz, () => parseBookingIcal(text));
      expect(ranges, `TZ=${tz}`).toEqual(expected);
      for (const range of ranges) {
        expect(isIsoDate(range.start) && isIsoDate(range.end)).toBe(true);
        expect(range.start < range.end).toBe(true);
      }
    }
  });
});

// --- env key -------------------------------------------------------------------

describe("bookingIcalEnvKey", () => {
  it("derives the variable name from the slug", () => {
    expect(bookingIcalEnvKey("de-lux")).toBe("BOOKING_ICAL_URL_DE_LUX");
    expect(bookingIcalEnvKey("apartman-2")).toBe("BOOKING_ICAL_URL_APARTMAN_2");
  });
});

// --- getBookingRanges (fetch, cache options, fallback) ---------------------------

const SLUG = "test-apt";
const SECRET = "secret-token-123";
const FAKE_URL = `https://ical.example.test/v1/export?t=${SECRET}`;

describe("getBookingRanges", () => {
  let warn: MockInstance<typeof console.warn>;
  let error: MockInstance<typeof console.error>;

  // Fresh module per test, so the in-memory "last good result" starts empty.
  const load = () => import("@/lib/booking-ical");
  const stubFetch = (...responses: (Response | Error)[]) => {
    const fetchMock = vi.fn<typeof fetch>();
    for (const response of responses) {
      if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
      else fetchMock.mockResolvedValueOnce(response);
    }
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };
  const ok = (body = SAMPLE) => new Response(body, { status: 200 });

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv(bookingIcalEnvKey(SLUG), FAKE_URL);
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Whatever happened in the test, the URL must never reach the logs.
    const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
    expect(logged).not.toContain(SECRET);
    expect(logged).not.toContain("example.test");

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns an empty list and warns (without a URL) when the env variable is missing", async () => {
    const { getBookingRanges } = await load();
    const fetchMock = stubFetch();

    expect(await getBookingRanges("no-url")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("BOOKING_ICAL_URL_NO_URL");
  });

  it("uses a 10 minute cache, a timeout and a User-Agent by default", async () => {
    const { getBookingRanges } = await load();
    const fetchMock = stubFetch(ok());

    expect(await getBookingRanges(SLUG)).toEqual(EXPECTED);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(FAKE_URL);
    expect(init?.next).toEqual({ revalidate: 600 });
    expect(init?.cache).toBeUndefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get("User-Agent")).toBeTruthy();
  });

  it("skips the cache with fresh: true", async () => {
    const { getBookingRanges } = await load();
    const fetchMock = stubFetch(ok());

    await getBookingRanges(SLUG, { fresh: true });
    const init = fetchMock.mock.calls[0][1];
    expect(init?.cache).toBe("no-store");
    expect(init?.next).toBeUndefined();
  });

  it("falls back to the last good result when Booking fails", async () => {
    const { getBookingRanges } = await load();
    stubFetch(ok(), new TypeError("fetch failed"));

    expect(await getBookingRanges(SLUG)).toEqual(EXPECTED);
    expect(await getBookingRanges(SLUG)).toEqual(EXPECTED);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("throws when Booking fails and there is no earlier result", async () => {
    const { getBookingRanges, BookingIcalError } = await load();
    stubFetch(new DOMException("The operation timed out.", "TimeoutError"));

    await expect(getBookingRanges(SLUG)).rejects.toBeInstanceOf(BookingIcalError);
  });

  it("never uses the fallback with fresh: true", async () => {
    const { getBookingRanges, BookingIcalError } = await load();
    stubFetch(ok(), new TypeError("fetch failed"));

    await getBookingRanges(SLUG);
    await expect(getBookingRanges(SLUG, { fresh: true })).rejects.toBeInstanceOf(BookingIcalError);
  });

  it("treats a non-200 answer as a failure", async () => {
    const { getBookingRanges } = await load();
    stubFetch(new Response("error", { status: 500 }));

    await expect(getBookingRanges(SLUG)).rejects.toThrow(/HTTP 500/);
  });

  it("treats an HTML page with status 200 as a failure", async () => {
    const { getBookingRanges } = await load();
    stubFetch(new Response("<html>Something went wrong</html>", { status: 200 }));

    await expect(getBookingRanges(SLUG)).rejects.toThrow(/not an iCal file/);
  });

  it("does not leak the URL when the fetch error message contains it", async () => {
    const { getBookingRanges } = await load();
    stubFetch(new TypeError(`Failed to parse URL from ${FAKE_URL}`));

    const failure = await getBookingRanges(SLUG).catch((reason: unknown) => reason);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).not.toContain(SECRET);
  });
});
