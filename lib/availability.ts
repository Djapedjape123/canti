import "server-only";
import { getBookingRanges, type BookingRange } from "./booking-ical";
import { addDays } from "./dates";

/**
 * Every night covered by `ranges` inside [from, to), sorted, without duplicates.
 * Ranges are [start, end): the end date itself is free (check_out is exclusive).
 */
export function nightsFromRanges(ranges: readonly BookingRange[], from: string, to: string): string[] {
  const nights = new Set<string>();
  for (const range of ranges) {
    const first = range.start > from ? range.start : from;
    const end = range.end < to ? range.end : to;
    for (let night = first; night < end; night = addDays(night, 1)) nights.add(night);
  }
  return [...nights].sort();
}

/**
 * Nights that cannot be booked in [from, to), as 'YYYY-MM-DD'.
 * Only dates go out of here, never where they came from.
 * Throws BookingIcalError when Booking cannot be read and nothing is cached.
 */
export async function getBlockedNights(slug: string, from: string, to: string): Promise<string[]> {
  const bookingRanges = await getBookingRanges(slug);

  // TODO(Supabase): add our own reservations with status pending, confirmed or blocked
  // (booked = Booking iCal ∪ our reservations). They are [check_in, check_out) ranges
  // too, so they go through nightsFromRanges together with bookingRanges.
  return nightsFromRanges(bookingRanges, from, to);
}
