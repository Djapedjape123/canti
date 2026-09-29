import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { bookingIcalEnvKey, classifyBookingError, parseBookingIcal, type BookingRange } from "@/lib/booking-ical";
import { isIsoDate } from "@/lib/dates";
import { cacheCalls } from "./stubs/next-cache";

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

// --- classifyBookingError ------------------------------------------------------

/** What fetch() throws for a network problem: a TypeError with the system code in `cause`. */
function fetchFailed(code: string): TypeError {
  return new TypeError("fetch failed", { cause: Object.assign(new Error("boom"), { code }) });
}

describe("classifyBookingError", () => {
  it.each([
    ["ECONNRESET", "connection-reset"],
    ["UND_ERR_SOCKET", "connection-reset"],
    ["UND_ERR_CONNECT_TIMEOUT", "timeout"],
    ["ETIMEDOUT", "timeout"],
    ["ECONNREFUSED", "connect-failed"],
    ["ENOTFOUND", "dns"],
    ["EAI_AGAIN", "dns"],
    ["CERT_HAS_EXPIRED", "tls"],
    ["EPROTO", "network"],
  ] as const)("maps %s to %s", (code, expected) => {
    expect(classifyBookingError(fetchFailed(code))).toEqual({ code: expected, detail: code });
  });

  it("finds the code inside an AggregateError (IPv4 + IPv6 attempts)", () => {
    const cause = new AggregateError([Object.assign(new Error("x"), { code: "ECONNREFUSED" })]);
    expect(classifyBookingError(new TypeError("fetch failed", { cause }))).toEqual({
      code: "connect-failed",
      detail: "ECONNREFUSED",
    });
  });

  it("recognizes the timeout from AbortSignal.timeout()", () => {
    expect(classifyBookingError(new DOMException("The operation timed out.", "TimeoutError"))).toEqual({
      code: "timeout",
      detail: "TimeoutError",
    });
  });

  it("falls back to the error name, never the message", () => {
    const failure = classifyBookingError(new TypeError("Failed to parse URL from https://secret"));
    expect(failure).toEqual({ code: "network", detail: "TypeError" });
  });

  it("does not trust a code that does not look like a system code", () => {
    expect(classifyBookingError(fetchFailed("https://secret?t=1"))).toEqual({ code: "network", detail: "TypeError" });
  });
});

// --- getBookingRanges (fetch, cache, retry, fallback) ------------------------------

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
  /** Runs the 1 s pause between attempts instantly. */
  const settle = async <T,>(promise: Promise<T>): Promise<T> => {
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    return promise;
  };
  const logged = () => JSON.stringify([...warn.mock.calls, ...error.mock.calls]);

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    cacheCalls().length = 0;
    vi.stubEnv(bookingIcalEnvKey(SLUG), FAKE_URL);
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // Whatever happened in the test, the URL must never reach the logs or the cache key.
    const everything = logged() + JSON.stringify(cacheCalls());
    expect(everything).not.toContain(SECRET);
    expect(everything).not.toContain("example.test");

    vi.useRealTimers();
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

  it("caches the parsed calendar for 10 minutes, never the raw answer", async () => {
    const { getBookingRanges } = await load();
    const fetchMock = stubFetch(ok());

    expect(await getBookingRanges(SLUG)).toEqual(EXPECTED);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(FAKE_URL);
    // The request itself is not cached by Next.js: a bad answer must never be stored.
    expect(init?.cache).toBe("no-store");
    expect(init?.next).toBeUndefined();
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get("User-Agent")).toBeTruthy();
    expect(cacheCalls()).toEqual([
      { keyParts: expect.arrayContaining(["booking-ical", SLUG]), options: { revalidate: 600 } },
    ]);
  });

  it("uses a new cache entry when the link changes", async () => {
    const { getBookingRanges } = await load();
    stubFetch(ok(), ok());

    await getBookingRanges(SLUG);
    vi.stubEnv(bookingIcalEnvKey(SLUG), `${FAKE_URL}-new`);
    await getBookingRanges(SLUG);
    const [first, second] = cacheCalls().map(({ keyParts }) => JSON.stringify(keyParts));
    expect(first).not.toBe(second);
  });

  it("skips the cache with fresh: true", async () => {
    const { getBookingRanges } = await load();
    const fetchMock = stubFetch(ok());

    await getBookingRanges(SLUG, { fresh: true });
    expect(fetchMock.mock.calls[0][1]?.cache).toBe("no-store");
    expect(cacheCalls()).toEqual([]);
  });

  it("retries once after a dropped connection and logs why", async () => {
    const { getBookingRanges } = await load();
    const fetchMock = stubFetch(fetchFailed("ECONNRESET"), ok());

    expect(await settle(getBookingRanges(SLUG, { fresh: true }))).toEqual(EXPECTED);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(error.mock.calls[0][0])).toMatch(/connection-reset \(ECONNRESET\), attempt 1\/2, fresh.*retrying/);
    expect(String(warn.mock.calls[0][0])).toMatch(/attempt 2\/2/);
  });

  it("does not retry a link that does not exist", async () => {
    const { getBookingRanges } = await load();
    const fetchMock = stubFetch(new Response("", { status: 404 }));

    const failure = await settle(getBookingRanges(SLUG)).catch((reason: unknown) => reason);
    expect(failure).toMatchObject({ name: "BookingIcalError", code: "link-not-found", detail: "HTTP 404" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the last good result when Booking fails", async () => {
    const { getBookingRanges } = await load();
    stubFetch(ok(), new TypeError("fetch failed"), new TypeError("fetch failed"));

    expect(await getBookingRanges(SLUG)).toEqual(EXPECTED);
    expect(await settle(getBookingRanges(SLUG))).toEqual(EXPECTED);
    expect(error).toHaveBeenCalledTimes(2);
    expect(logged()).toContain("last good result");
  });

  it("throws with the failure code when Booking fails and there is no earlier result", async () => {
    const { getBookingRanges, BookingIcalError } = await load();
    const timeout = () => new DOMException("The operation timed out.", "TimeoutError");
    stubFetch(timeout(), timeout());

    const failure = await settle(getBookingRanges(SLUG)).catch((reason: unknown) => reason);
    expect(failure).toBeInstanceOf(BookingIcalError);
    expect(failure).toMatchObject({ code: "timeout" });
  });

  it("never uses the fallback with fresh: true", async () => {
    const { getBookingRanges, BookingIcalError } = await load();
    stubFetch(ok(), new TypeError("fetch failed"), new TypeError("fetch failed"));

    await getBookingRanges(SLUG);
    await expect(settle(getBookingRanges(SLUG, { fresh: true }))).rejects.toBeInstanceOf(BookingIcalError);
  });

  it("treats a 5xx answer as a Booking server error (after a retry)", async () => {
    const { getBookingRanges } = await load();
    stubFetch(new Response("error", { status: 500 }), new Response("error", { status: 503 }));

    await expect(settle(getBookingRanges(SLUG))).rejects.toMatchObject({
      code: "booking-server-error",
      detail: "HTTP 503",
    });
  });

  it("treats an HTML page with status 200 as a failure and says what came back", async () => {
    const { getBookingRanges } = await load();
    const html = () =>
      new Response("<html>Something went wrong</html>", { status: 200, headers: { "content-type": "text/html" } });
    stubFetch(html(), html());

    await expect(settle(getBookingRanges(SLUG))).rejects.toMatchObject({ code: "not-ical" });
    expect(logged()).toContain("not-ical (text/html, 33 bytes)");
  });

  it("does not leak the URL when the fetch error message contains it", async () => {
    const { getBookingRanges } = await load();
    const leaky = () => new TypeError(`Failed to parse URL from ${FAKE_URL}`);
    stubFetch(leaky(), leaky());

    const failure = await settle(getBookingRanges(SLUG)).catch((reason: unknown) => reason);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).not.toContain(SECRET);
  });
});
