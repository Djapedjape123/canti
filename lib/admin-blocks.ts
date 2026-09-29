import { daysLabel, type DayRange, type RangeSummary } from "./admin-calendar";
import { adminText } from "./admin-text";
import { addDays, nightsBetween, nightsFromRanges } from "./dates";
import { fill } from "./format";

// Pure logic of blocking and unblocking dates (app/api/admin/blocks and the
// editor in the admin calendar). The owner picks DAYS; a blocked day is a
// closed NIGHT, so the days 10–12 become one block with check_in 10 and
// check_out 13 (exclusive): a guest can still arrive on the 13th and leave on the 10th.

/** [start, end) nights, the same shape as check_in / check_out and Booking's ranges. */
export type NightRange = { start: string; end: string };

/** Picked days (both ends included) → the nights they close. */
export function nightsOfDays(range: DayRange): NightRange {
  return { start: range.from, end: addDays(range.to, 1) };
}

/**
 * Days before today are cut off: a night that is over is not blocked or
 * unblocked any more. null when every picked day is in the past.
 */
export function clipToToday(range: DayRange, today: string): DayRange | null {
  if (range.to < today) return null;
  return { from: range.from < today ? today : range.from, to: range.to };
}

/** What PUT /api/admin/blocks answers. */
export type BlockResult = {
  blockedNights: number;
  /** Taken on Booking.com: we only read those, never block them (no loop through our iCal export). */
  skippedBooking: number;
  /** Already held by one of our reservations or blocks. */
  skippedReserved: number;
};

export type BlockPlan = BlockResult & {
  /** Free nights in a row: one new `blocked` reservation each. */
  runs: NightRange[];
};

/**
 * Which of `nights` get blocked: every free one. Nights taken on Booking or by
 * our own reservations are skipped. A night that is on both counts as Booking.
 */
export function blockPlan(
  nights: NightRange,
  bookingRanges: readonly NightRange[],
  ownRanges: readonly NightRange[],
): BlockPlan {
  const booking = new Set(nightsFromRanges(bookingRanges, nights.start, nights.end));
  const own = new Set(nightsFromRanges(ownRanges, nights.start, nights.end));

  const runs: NightRange[] = [];
  let runStart: string | null = null;
  let skippedBooking = 0;
  let skippedReserved = 0;

  for (let night = nights.start; night < nights.end; night = addDays(night, 1)) {
    if (booking.has(night)) skippedBooking++;
    else if (own.has(night)) skippedReserved++;
    else {
      runStart ??= night;
      continue;
    }
    // A taken night ends the run of free nights before it.
    if (runStart !== null) {
      runs.push({ start: runStart, end: night });
      runStart = null;
    }
  }
  if (runStart !== null) runs.push({ start: runStart, end: nights.end });

  const blockedNights = runs.reduce((sum, run) => sum + nightsBetween(run.start, run.end), 0);
  return { runs, blockedNights, skippedBooking, skippedReserved };
}

// ---------------------------------------------------------------------------
// The API answer and the message after a save
// ---------------------------------------------------------------------------

/** A count from an API answer; anything missing or strange counts as 0. */
export function readCount(data: unknown, key: string): number {
  const value: unknown = typeof data === "object" && data !== null ? Reflect.get(data, key) : undefined;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

export function readBlockResult(data: unknown): BlockResult {
  return {
    blockedNights: readCount(data, "blockedNights"),
    skippedBooking: readCount(data, "skippedBooking"),
    skippedReserved: readCount(data, "skippedReserved"),
  };
}

const t = adminText.blocks;

/** "Blokirano 5 dana ✓ · Preskočeno: Booking 2 dana, već zauzeto 1 dan" */
export function blockNotice({ blockedNights, skippedBooking, skippedReserved }: BlockResult): string {
  const done = fill(t.blockDone, { days: daysLabel(blockedNights) });
  const skipped = [
    skippedBooking > 0 ? fill(t.skippedBooking, { days: daysLabel(skippedBooking) }) : null,
    skippedReserved > 0 ? fill(t.skippedReserved, { days: daysLabel(skippedReserved) }) : null,
  ].filter((part) => part !== null);
  return skipped.length > 0 ? `${done} · ${t.skipped}: ${skipped.join(", ")}` : done;
}

/** "Odblokirano 3 dana ✓" */
export function unblockNotice(unblockedNights: number): string {
  return fill(t.unblockDone, { days: daysLabel(unblockedNights) });
}

/**
 * The lines under "Dostupnost" in the editor: what the picked days are, and
 * where the ones that cannot be changed here are changed instead.
 */
export function summaryLines(summary: RangeSummary): string[] {
  const s = t.summary;
  const counted = (template: string, count: number) => (count > 0 ? fill(template, { days: daysLabel(count) }) : null);
  return [
    counted(s.free, summary.free),
    counted(s.blocked, summary.blocked),
    counted(s.booking, summary.booking),
    counted(s.guests, summary.guests),
    summary.past > 0 ? s.past : null,
    summary.unknown ? s.unknown : null,
  ].filter((line) => line !== null);
}
