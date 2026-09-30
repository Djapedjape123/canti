import "server-only";
import { nightStatuses, type LoadedWindow, type NightReservation, type NightStatuses } from "./admin-calendar";
import { getBookingRanges } from "./booking-ical";
import { nightsFromRanges } from "./dates";
import { getActiveReservationRanges, getGuestReservationsByNight, getReservationRanges } from "./reservations";

// Lives in lib/dates.ts (the admin calendar needs it in the browser too);
// exported here as well, where the public side has always imported it from.
export { nightsFromRanges };

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

/**
 * ADMIN ONLY: who holds each night of the loaded months (the colors of the
 * admin calendar). Booking is read with the usual 10-minute cache. When it
 * cannot be read, the calendar still shows our own reservations and says
 * that the Booking dates are missing.
 */
export async function getAdminNightStatuses(
  slug: string,
  apartmentId: string,
  window: LoadedWindow,
): Promise<{
  statuses: NightStatuses;
  bookingUnavailable: boolean;
  guestReservations: Record<string, NightReservation>;
}> {
  const [bookingRanges, ownRanges, guestReservations] = await Promise.all([
    // getBookingRanges already logs why it failed.
    getBookingRanges(slug).catch(() => null),
    getActiveReservationRanges(apartmentId, window.from, window.until),
    getGuestReservationsByNight(apartmentId, window.from, window.until),
  ]);
  return {
    statuses: nightStatuses(bookingRanges ?? [], ownRanges, window),
    bookingUnavailable: bookingRanges === null,
    guestReservations,
  };
}
