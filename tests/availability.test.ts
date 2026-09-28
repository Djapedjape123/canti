import { describe, expect, it } from "vitest";
import { nightsFromRanges } from "@/lib/availability";

describe("nightsFromRanges", () => {
  it("lists the nights of a stay, without the check-out day", () => {
    expect(nightsFromRanges([{ start: "2026-10-02", end: "2026-10-05" }], "2026-10-01", "2026-11-01")).toEqual([
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("cuts a range that starts before `from`", () => {
    expect(nightsFromRanges([{ start: "2026-09-28", end: "2026-10-03" }], "2026-10-01", "2026-11-01")).toEqual([
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("cuts a range that ends after `to` (to is exclusive)", () => {
    expect(nightsFromRanges([{ start: "2026-10-30", end: "2026-11-04" }], "2026-10-01", "2026-11-01")).toEqual([
      "2026-10-30",
      "2026-10-31",
    ]);
  });

  it("merges overlapping ranges without duplicates and sorts the result", () => {
    const ranges = [
      { start: "2026-10-12", end: "2026-10-14" },
      { start: "2026-10-02", end: "2026-10-04" },
      { start: "2026-10-03", end: "2026-10-05" },
    ];
    expect(nightsFromRanges(ranges, "2026-10-01", "2026-11-01")).toEqual([
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-12",
      "2026-10-13",
    ]);
  });

  it("ignores ranges completely outside the window", () => {
    const ranges = [
      { start: "2026-09-01", end: "2026-09-05" },
      { start: "2026-12-01", end: "2026-12-05" },
    ];
    expect(nightsFromRanges(ranges, "2026-10-01", "2026-11-01")).toEqual([]);
  });

  it("returns an empty list for no ranges", () => {
    expect(nightsFromRanges([], "2026-10-01", "2026-11-01")).toEqual([]);
  });
});
