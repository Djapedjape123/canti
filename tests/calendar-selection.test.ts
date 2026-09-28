import { describe, expect, it } from "vitest";
import {
  canCheckIn,
  canCheckOut,
  isSelectable,
  latestCheckOut,
  nextSelection,
  rangeFromQuery,
  type SelectionContext,
} from "@/lib/calendar-selection";

// Another guest sleeps the nights of 10 and 11 Oct (arrives on the 10th, leaves on the 12th).
const ctx: SelectionContext = {
  today: "2026-10-05",
  until: "2027-10-05",
  blocked: new Set(["2026-10-10", "2026-10-11"]),
};

describe("check-in", () => {
  it("is not possible on a booked night", () => {
    expect(canCheckIn("2026-10-10", ctx)).toBe(false);
    expect(canCheckIn("2026-10-11", ctx)).toBe(false);
  });

  it("is possible on the day the other guest leaves", () => {
    expect(canCheckIn("2026-10-12", ctx)).toBe(true);
  });

  it("is not possible before today or from `until` on", () => {
    expect(canCheckIn("2026-10-04", ctx)).toBe(false);
    expect(canCheckIn("2026-10-05", ctx)).toBe(true);
    expect(canCheckIn("2027-10-05", ctx)).toBe(false);
  });
});

describe("check-out", () => {
  it("can be the day the other guest arrives (check_out is exclusive)", () => {
    expect(canCheckOut("2026-10-09", "2026-10-10", ctx)).toBe(true);
    expect(latestCheckOut("2026-10-07", ctx)).toBe("2026-10-10");
  });

  it("can't jump over a booked night", () => {
    expect(canCheckOut("2026-10-07", "2026-10-11", ctx)).toBe(false);
    expect(canCheckOut("2026-10-07", "2026-10-13", ctx)).toBe(false);
  });

  it("must be after check-in", () => {
    expect(canCheckOut("2026-10-07", "2026-10-07", ctx)).toBe(false);
    expect(canCheckOut("2026-10-07", "2026-10-06", ctx)).toBe(false);
  });

  it("allows at most 30 nights", () => {
    expect(latestCheckOut("2026-10-12", ctx)).toBe("2026-11-11");
    expect(canCheckOut("2026-10-12", "2026-11-11", ctx)).toBe(true);
    expect(canCheckOut("2026-10-12", "2026-11-12", ctx)).toBe(false);
  });

  it("stops at `until`, which itself is a valid check-out", () => {
    const short = { ...ctx, until: "2026-10-20" };
    expect(latestCheckOut("2026-10-12", short)).toBe("2026-10-20");
  });
});

describe("isSelectable", () => {
  it("makes a booked day clickable only as the check-out of the current choice", () => {
    expect(isSelectable("2026-10-10", { checkIn: null, checkOut: null }, ctx)).toBe(false);
    expect(isSelectable("2026-10-10", { checkIn: "2026-10-07", checkOut: null }, ctx)).toBe(true);
    expect(isSelectable("2026-10-11", { checkIn: "2026-10-07", checkOut: null }, ctx)).toBe(false);
    expect(isSelectable("2026-10-10", { checkIn: "2026-10-07", checkOut: "2026-10-09" }, ctx)).toBe(false);
  });
});

describe("nextSelection", () => {
  const empty = { checkIn: null, checkOut: null };

  it("first click picks the check-in, second the check-out", () => {
    const first = nextSelection(empty, "2026-10-07", ctx);
    expect(first).toEqual({ checkIn: "2026-10-07", checkOut: null });
    expect(nextSelection(first, "2026-10-10", ctx)).toEqual({ checkIn: "2026-10-07", checkOut: "2026-10-10" });
  });

  it("a free day after the latest check-out starts a new stay", () => {
    expect(nextSelection({ checkIn: "2026-10-07", checkOut: null }, "2026-10-13", ctx)).toEqual({
      checkIn: "2026-10-13",
      checkOut: null,
    });
  });

  it("a day before the check-in starts a new stay", () => {
    expect(nextSelection({ checkIn: "2026-10-07", checkOut: null }, "2026-10-06", ctx)).toEqual({
      checkIn: "2026-10-06",
      checkOut: null,
    });
  });

  it("a click after a complete stay starts a new one", () => {
    expect(nextSelection({ checkIn: "2026-10-07", checkOut: "2026-10-09" }, "2026-10-08", ctx)).toEqual({
      checkIn: "2026-10-08",
      checkOut: null,
    });
  });

  it("a booked day that is not a valid check-out changes nothing", () => {
    const current = { checkIn: "2026-10-07", checkOut: null };
    expect(nextSelection(current, "2026-10-11", ctx)).toBe(current);
    expect(nextSelection(empty, "2026-10-10", ctx)).toBe(empty);
  });
});

describe("rangeFromQuery", () => {
  it("keeps a valid range", () => {
    expect(rangeFromQuery("2026-10-07", "2026-10-10", ctx)).toEqual({ checkIn: "2026-10-07", checkOut: "2026-10-10" });
  });

  it("drops a check-out that jumps over a booked night, keeps the check-in", () => {
    expect(rangeFromQuery("2026-10-07", "2026-10-14", ctx)).toEqual({ checkIn: "2026-10-07", checkOut: null });
  });

  it("drops everything when the check-in night is booked", () => {
    expect(rangeFromQuery("2026-10-10", "2026-10-13", ctx)).toEqual({ checkIn: null, checkOut: null });
  });

  it("drops invalid or missing values", () => {
    expect(rangeFromQuery("2026-02-30", "2026-03-02", ctx)).toEqual({ checkIn: null, checkOut: null });
    expect(rangeFromQuery(undefined, undefined, ctx)).toEqual({ checkIn: null, checkOut: null });
    expect(rangeFromQuery(["2026-10-07"], "2026-10-09", ctx)).toEqual({ checkIn: null, checkOut: null });
    expect(rangeFromQuery("2026-10-07", "tomorrow", ctx)).toEqual({ checkIn: "2026-10-07", checkOut: null });
  });

  it("drops a check-in in the past", () => {
    expect(rangeFromQuery("2026-10-01", "2026-10-03", ctx)).toEqual({ checkIn: null, checkOut: null });
  });
});
