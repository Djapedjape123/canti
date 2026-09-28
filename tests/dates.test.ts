import { describe, expect, it } from "vitest";
import { dateInBelgrade, todayInBelgrade } from "@/lib/dates";

describe("dateInBelgrade", () => {
  it("uses the Belgrade date when UTC is still on the previous day (summer time, UTC+2)", () => {
    expect(dateInBelgrade(new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
  });

  it("follows the switch to winter time on 25 Oct 2026 (UTC+1)", () => {
    // 22:30 UTC = 23:30 in Belgrade, still the 25th
    expect(dateInBelgrade(new Date("2026-10-25T22:30:00Z"))).toBe("2026-10-25");
    expect(dateInBelgrade(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
  });

  it("crosses into the new year before UTC does", () => {
    expect(dateInBelgrade(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });

  it("todayInBelgrade is the same helper", () => {
    const now = new Date("2026-09-28T23:10:00Z");
    expect(todayInBelgrade(now)).toBe("2026-09-29");
  });
});
