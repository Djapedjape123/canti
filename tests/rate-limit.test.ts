import { describe, expect, it } from "vitest";
import { checkRateLimit, ipFromHeaders, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "@/lib/rate-limit";

// Each test uses its own IP, because the counters are shared module state.

describe("checkRateLimit", () => {
  it(`allows ${RATE_LIMIT_MAX_REQUESTS} requests from one IP and refuses the next`, () => {
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) expect(checkRateLimit("10.0.0.1", now)).toBe(true);
    expect(checkRateLimit("10.0.0.1", now)).toBe(false);
  });

  it("counts every IP separately", () => {
    const now = 2_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) checkRateLimit("10.0.0.2", now);
    expect(checkRateLimit("10.0.0.2", now)).toBe(false);
    expect(checkRateLimit("10.0.0.3", now)).toBe(true);
  });

  it("allows requests again once the window has passed", () => {
    const now = 3_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) checkRateLimit("10.0.0.4", now);
    expect(checkRateLimit("10.0.0.4", now + RATE_LIMIT_WINDOW_MS - 1)).toBe(false);
    expect(checkRateLimit("10.0.0.4", now + RATE_LIMIT_WINDOW_MS)).toBe(true);
  });
});

describe("ipFromHeaders", () => {
  it("takes the first address from x-forwarded-for", () => {
    expect(ipFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to 'unknown' without the header", () => {
    expect(ipFromHeaders(new Headers())).toBe("unknown");
  });
});
