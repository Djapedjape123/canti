import "server-only";
import { getBookingRanges, type BookingRange } from "./booking-ical";
import { addDays } from "./dates";
import { getReservationRanges } from "./reservations";

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
 * Booked = Booking iCal ∪ our reservations (pending, confirmed, blocked).
 * Only dates go out of here, never where they came from.
 * Throws BookingIcalError when Booking cannot be read and nothing is cached.
 */
export async function getBlockedNights(
  slug: string,
  apartmentId: string,
  from: string,
  to: string,
): Promise<string[]> {
  const [bookingRanges, reservationRanges] = await Promise.all([
    getBookingRanges(slug),
    getReservationRanges(apartmentId, from, to),
  ]);
  return nightsFromRanges([...bookingRanges, ...reservationRanges], from, to);
}
