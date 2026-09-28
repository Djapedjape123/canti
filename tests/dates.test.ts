import { describe, expect, it } from "vitest";
import { dateInBelgrade, daysInclusive, isIsoDate, todayInBelgrade } from "@/lib/dates";

describe("isIsoDate", () => {
  it("accepts real calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-12-31")).toBe(true);
  });

  it("refuses dates that do not exist, without throwing", () => {
    for (const value of ["2026-02-30", "2027-02-29", "2026-13-01", "2026-00-10", "2026-02-32", "9999-99-99"]) {
      expect(isIsoDate(value)).toBe(false);
    }
  });

  it("refuses other formats", () => {
    for (const value of ["2026-2-3", "31.12.2026", "2026-12-31T00:00:00Z", ""]) {
      expect(isIsoDate(value)).toBe(false);
    }
  });
});

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

describe("daysInclusive (admin ranges: days, not nights)", () => {
  it("includes both ends: 31 Dec – 2 Jan is 3 days", () => {
    expect(daysInclusive("2026-12-31", "2027-01-02")).toEqual(["2026-12-31", "2027-01-01", "2027-01-02"]);
  });

  it("one day when from = to", () => {
    expect(daysInclusive("2026-10-02", "2026-10-02")).toEqual(["2026-10-02"]);
  });

  it("is empty when `to` is before `from`", () => {
    expect(daysInclusive("2026-10-05", "2026-10-04")).toEqual([]);
  });

  it("keeps every day across the switch to winter time", () => {
    expect(daysInclusive("2026-10-24", "2026-10-26")).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
  });

  it("knows leap years", () => {
    expect(daysInclusive("2028-02-28", "2028-03-01")).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
    expect(daysInclusive("2026-01-01", "2026-12-31")).toHaveLength(365);
    expect(daysInclusive("2028-01-01", "2028-12-31")).toHaveLength(366);
  });
});
