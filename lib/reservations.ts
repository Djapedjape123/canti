import "server-only";
import type { BookingRange } from "./booking-ical";
import { getSupabaseAdmin } from "./supabase/admin";

/** Statuses that hold the dates. A cancelled reservation frees them. */
export const BLOCKING_STATUSES = ["pending", "confirmed", "blocked"] as const;

/**
 * Our own reservations that touch [from, to), as [check_in, check_out) ranges:
 * the same shape as Booking's ranges, so both go through nightsFromRanges.
 * Only dates are selected, never guest data.
 */
export async function getReservationRanges(apartmentId: string, from: string, to: string): Promise<BookingRange[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("reservations")
    .select("check_in, check_out")
    .eq("apartment_id", apartmentId)
    .in("status", [...BLOCKING_STATUSES])
    // Overlap with [from, to): starts before `to` and ends after `from` (check_out is exclusive).
    .lt("check_in", to)
    .gt("check_out", from);
  if (error) throw new Error(`Loading reservations failed: ${error.message}`);
  return data.map((row) => ({ start: row.check_in, end: row.check_out }));
}
