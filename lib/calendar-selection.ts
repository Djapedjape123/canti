import { addDays, isIsoDate } from "./dates";

// Rules for picking a stay in the public calendar. Pure functions, shared by the
// client calendar and the server page (which validates ?checkIn&checkOut).
// A night is named by the date it starts. check_out is exclusive, so the first
// booked night after our check-in is still a valid check-out day for us, and the
// day another guest leaves is a free night and a valid check-in day.

export const MAX_NIGHTS = 30;

export type SelectionContext = {
  /** 'YYYY-MM-DD' in Europe/Belgrade */
  today: string;
  /** First night we have no availability data for (exclusive end of the window). */
  until: string;
  /** Booked nights. */
  blocked: ReadonlySet<string>;
};

export type Selection = { checkIn: string | null; checkOut: string | null };

export function canCheckIn(date: string, ctx: SelectionContext): boolean {
  return date >= ctx.today && date < ctx.until && !ctx.blocked.has(date);
}

/**
 * Latest possible check-out for this check-in: the first booked night after it
 * (a stay can't jump over a booked night), at most 30 nights, at most `until`.
 */
export function latestCheckOut(checkIn: string, ctx: SelectionContext): string {
  const maxNights = addDays(checkIn, MAX_NIGHTS);
  const limit = maxNights < ctx.until ? maxNights : ctx.until;
  for (let night = addDays(checkIn, 1); night < limit; night = addDays(night, 1)) {
    if (ctx.blocked.has(night)) return night;
  }
  return limit;
}

export function canCheckOut(checkIn: string, date: string, ctx: SelectionContext): boolean {
  return date > checkIn && date <= latestCheckOut(checkIn, ctx);
}

/** Can this day be clicked right now (as check-in, or as check-out while one is being chosen)? */
export function isSelectable(date: string, selection: Selection, ctx: SelectionContext): boolean {
  if (canCheckIn(date, ctx)) return true;
  return selection.checkIn !== null && selection.checkOut === null && canCheckOut(selection.checkIn, date, ctx);
}

/** New selection after a click on `date`. */
export function nextSelection(selection: Selection, date: string, ctx: SelectionContext): Selection {
  if (selection.checkIn && !selection.checkOut && canCheckOut(selection.checkIn, date, ctx)) {
    return { checkIn: selection.checkIn, checkOut: date };
  }
  // Otherwise the click starts a new stay (also past the latest check-out).
  if (canCheckIn(date, ctx)) return { checkIn: date, checkOut: null };
  return selection;
}

/**
 * Only accept a valid range from the URL (?checkIn=…&checkOut=…).
 * A check-out that is invalid (or jumps over a booked night) is dropped, the check-in stays.
 */
export function rangeFromQuery(checkIn: unknown, checkOut: unknown, ctx: SelectionContext): Selection {
  if (typeof checkIn !== "string" || !isIsoDate(checkIn) || !canCheckIn(checkIn, ctx)) {
    return { checkIn: null, checkOut: null };
  }
  const outOk = typeof checkOut === "string" && isIsoDate(checkOut) && canCheckOut(checkIn, checkOut, ctx);
  return { checkIn, checkOut: outOk ? checkOut : null };
}
