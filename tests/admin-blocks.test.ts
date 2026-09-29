import { describe, expect, it } from "vitest";
import {
  blockNotice,
  blockPlan,
  clipToToday,
  nightsOfDays,
  readBlockResult,
  readCount,
  summaryLines,
  unblockNotice,
} from "@/lib/admin-blocks";

describe("picked days → closed nights", () => {
  it("closes the night of every picked day: 10–12 Oct is check_in 10, check_out 13", () => {
    expect(nightsOfDays({ from: "2026-10-10", to: "2026-10-12" })).toEqual({ start: "2026-10-10", end: "2026-10-13" });
  });

  it("one day is one night", () => {
    expect(nightsOfDays({ from: "2026-10-10", to: "2026-10-10" })).toEqual({ start: "2026-10-10", end: "2026-10-11" });
  });

  it("crosses the new year", () => {
    expect(nightsOfDays({ from: "2026-12-31", to: "2027-01-01" })).toEqual({ start: "2026-12-31", end: "2027-01-02" });
  });
});

describe("clipToToday", () => {
  const today = "2026-10-10";

  it("leaves a range from today on as it is", () => {
    expect(clipToToday({ from: "2026-10-10", to: "2026-10-12" }, today)).toEqual({ from: "2026-10-10", to: "2026-10-12" });
    expect(clipToToday({ from: "2026-10-20", to: "2026-10-22" }, today)).toEqual({ from: "2026-10-20", to: "2026-10-22" });
  });

  it("cuts off the days before today", () => {
    expect(clipToToday({ from: "2026-10-05", to: "2026-10-12" }, today)).toEqual({ from: "2026-10-10", to: "2026-10-12" });
  });

  it("keeps today alone when the range ends today", () => {
    expect(clipToToday({ from: "2026-10-01", to: "2026-10-10" }, today)).toEqual({ from: "2026-10-10", to: "2026-10-10" });
  });

  it("returns null when every day is in the past", () => {
    expect(clipToToday({ from: "2026-10-01", to: "2026-10-09" }, today)).toBeNull();
  });
});

describe("blockPlan", () => {
  // Days 10–16 Oct = 7 nights, [10, 17).
  const nights = nightsOfDays({ from: "2026-10-10", to: "2026-10-16" });

  it("blocks every night when nothing is taken", () => {
    expect(blockPlan(nights, [], [])).toEqual({
      runs: [{ start: "2026-10-10", end: "2026-10-17" }],
      blockedNights: 7,
      skippedBooking: 0,
      skippedReserved: 0,
    });
  });

  it("skips Booking nights in the middle and blocks both sides", () => {
    const booking = [{ start: "2026-10-12", end: "2026-10-14" }];
    expect(blockPlan(nights, booking, [])).toEqual({
      runs: [
        { start: "2026-10-10", end: "2026-10-12" },
        { start: "2026-10-14", end: "2026-10-17" },
      ],
      blockedNights: 5,
      skippedBooking: 2,
      skippedReserved: 0,
    });
  });

  it("a Booking guest's check-out day is free (DTEND is exclusive)", () => {
    const booking = [{ start: "2026-10-07", end: "2026-10-10" }];
    expect(blockPlan(nights, booking, []).runs).toEqual([{ start: "2026-10-10", end: "2026-10-17" }]);
  });

  it("a Booking guest arriving the day after the last picked day is not touched", () => {
    const booking = [{ start: "2026-10-17", end: "2026-10-19" }];
    expect(blockPlan(nights, booking, [])).toMatchObject({ blockedNights: 7, skippedBooking: 0 });
  });

  it("skips our own guests and blocks", () => {
    const own = [
      { start: "2026-10-08", end: "2026-10-11" }, // guest leaving on the 11th
      { start: "2026-10-16", end: "2026-10-20" }, // block already there
    ];
    expect(blockPlan(nights, [], own)).toEqual({
      runs: [{ start: "2026-10-11", end: "2026-10-16" }],
      blockedNights: 5,
      skippedBooking: 0,
      skippedReserved: 2,
    });
  });

  it("counts a night that is both on Booking and ours once, as Booking", () => {
    const booking = [{ start: "2026-10-10", end: "2026-10-11" }];
    const own = [{ start: "2026-10-10", end: "2026-10-11" }];
    expect(blockPlan(nights, booking, own)).toMatchObject({ blockedNights: 6, skippedBooking: 1, skippedReserved: 0 });
  });

  it("has nothing to block when every night is taken", () => {
    const booking = [{ start: "2026-10-01", end: "2026-10-13" }];
    const own = [{ start: "2026-10-13", end: "2026-10-20" }];
    expect(blockPlan(nights, booking, own)).toEqual({
      runs: [],
      blockedNights: 0,
      skippedBooking: 3,
      skippedReserved: 4,
    });
  });

  it("works across months and years", () => {
    const newYear = nightsOfDays({ from: "2026-12-30", to: "2027-01-02" });
    const booking = [{ start: "2026-12-31", end: "2027-01-01" }];
    expect(blockPlan(newYear, booking, []).runs).toEqual([
      { start: "2026-12-30", end: "2026-12-31" },
      { start: "2027-01-01", end: "2027-01-03" },
    ]);
  });

  it("is not confused by the change to winter time (25 Oct 2026)", () => {
    const autumn = nightsOfDays({ from: "2026-10-24", to: "2026-10-26" });
    expect(blockPlan(autumn, [], [])).toMatchObject({
      runs: [{ start: "2026-10-24", end: "2026-10-27" }],
      blockedNights: 3,
    });
  });
});

describe("the API answer", () => {
  it("reads the counts", () => {
    expect(readBlockResult({ blockedNights: 5, skippedBooking: 2, skippedReserved: 0 })).toEqual({
      blockedNights: 5,
      skippedBooking: 2,
      skippedReserved: 0,
    });
    expect(readCount({ unblockedNights: 3 }, "unblockedNights")).toBe(3);
  });

  it("counts anything strange as 0", () => {
    expect(readBlockResult(null)).toEqual({ blockedNights: 0, skippedBooking: 0, skippedReserved: 0 });
    expect(readBlockResult("5")).toEqual({ blockedNights: 0, skippedBooking: 0, skippedReserved: 0 });
    for (const value of ["3", -1, 1.5, null, undefined]) {
      expect(readCount({ unblockedNights: value }, "unblockedNights")).toBe(0);
    }
  });
});

describe("messages", () => {
  it("says how many days were blocked", () => {
    expect(blockNotice({ blockedNights: 1, skippedBooking: 0, skippedReserved: 0 })).toBe("Blokirano 1 dan ✓");
    expect(blockNotice({ blockedNights: 5, skippedBooking: 0, skippedReserved: 0 })).toBe("Blokirano 5 dana ✓");
  });

  it("says what was skipped and why", () => {
    expect(blockNotice({ blockedNights: 5, skippedBooking: 2, skippedReserved: 0 })).toBe(
      "Blokirano 5 dana ✓ · Preskočeno: Booking 2 dana",
    );
    expect(blockNotice({ blockedNights: 5, skippedBooking: 2, skippedReserved: 1 })).toBe(
      "Blokirano 5 dana ✓ · Preskočeno: Booking 2 dana, već zauzeto 1 dan",
    );
  });

  it("says how many days were unblocked", () => {
    expect(unblockNotice(3)).toBe("Odblokirano 3 dana ✓");
    expect(unblockNotice(21)).toBe("Odblokirano 21 dan ✓");
  });
});

describe("summaryLines (under \"Dostupnost\" in the editor)", () => {
  const none = { free: 0, booking: 0, guests: 0, blocked: 0, past: 0, unknown: false };

  it("lists only what is in the picked days", () => {
    expect(summaryLines({ ...none, free: 3 })).toEqual(["Slobodno: 3 dana"]);
    expect(summaryLines({ ...none, free: 1, blocked: 2 })).toEqual(["Slobodno: 1 dan", "Blokirano: 2 dana"]);
  });

  it("says where Booking days and guests are changed instead", () => {
    expect(summaryLines({ ...none, booking: 2, guests: 1 })).toEqual([
      "Booking: 2 dana. Menja se samo na Booking.com.",
      "Gosti: 1 dan. Otkazuje se u Rezervacijama.",
    ]);
  });

  it("mentions past days and days outside the loaded months", () => {
    expect(summaryLines({ ...none, past: 2, unknown: true })).toEqual([
      "Prošli dani se ne menjaju.",
      "Deo izbora je van prikazanih meseci.",
    ]);
  });
});
