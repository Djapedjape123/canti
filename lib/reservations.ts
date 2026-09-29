import "server-only";
import type { ActiveStatus, OwnRange } from "./admin-calendar";
import { PAST_LIMIT, type AdminReservation, type StatusFilter } from "./admin-reservations";
import { getApartments } from "./apartments";
import type { BookingRange } from "./booking-ical";
import { getSupabaseAdmin } from "./supabase/admin";
import type { ReservationRow } from "./supabase/types";

/** Statuses that hold the dates. A cancelled reservation frees them. */
export const BLOCKING_STATUSES = ["pending", "confirmed", "blocked"] as const satisfies readonly ActiveStatus[];

/**
 * Our own reservations that touch [from, to), as [check_in, check_out) ranges
 * with their status. Only dates and status are selected, never guest data.
 */
export async function getActiveReservationRanges(apartmentId: string, from: string, to: string): Promise<OwnRange[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("reservations")
    .select("check_in, check_out, status")
    .eq("apartment_id", apartmentId)
    .in("status", [...BLOCKING_STATUSES])
    // Overlap with [from, to): starts before `to` and ends after `from` (check_out is exclusive).
    .lt("check_in", to)
    .gt("check_out", from);
  if (error) throw new Error(`Loading reservations failed: ${error.message}`);
  // The filter above already leaves cancelled rows out; this only tells TypeScript.
  return data.flatMap((row) =>
    row.status === "cancelled" ? [] : [{ start: row.check_in, end: row.check_out, status: row.status }],
  );
}

/**
 * The same, without the status: the same shape as Booking's ranges,
 * so both go through nightsFromRanges.
 */
export async function getReservationRanges(apartmentId: string, from: string, to: string): Promise<BookingRange[]> {
  const ranges = await getActiveReservationRanges(apartmentId, from, to);
  return ranges.map(({ start, end }) => ({ start, end }));
}

// ---------------------------------------------------------------------------
// Admin panel only: these read guest names and contacts.
// ---------------------------------------------------------------------------

const ADMIN_COLUMNS =
  "id, apartment_id, check_in, check_out, guest_name, guest_email, guest_phone, guests, total_price, status, source, created_at";

function reservationsWith(filter: StatusFilter) {
  const query = getSupabaseAdmin().from("reservations").select(ADMIN_COLUMNS);
  return filter === "all" ? query : query.eq("status", filter);
}

function toAdminReservation(row: ReservationRow, apartmentNames: Map<string, string>): AdminReservation {
  return {
    id: row.id,
    apartmentName: apartmentNames.get(row.apartment_id) ?? "",
    checkIn: row.check_in,
    checkOut: row.check_out,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    guests: row.guests,
    totalPrice: row.total_price,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
  };
}

/**
 * The admin list, split in two:
 * - upcoming: still ahead or under way (check_out >= today, so a guest who
 *   leaves today is still here), soonest arrival first, all of them;
 * - past: the latest PAST_LIMIT stays that are over, newest first.
 */
export async function getReservationsForAdmin(
  filter: StatusFilter,
  today: string,
): Promise<{ upcoming: AdminReservation[]; past: AdminReservation[] }> {
  const [apartments, upcoming, past] = await Promise.all([
    getApartments(),
    reservationsWith(filter).gte("check_out", today).order("check_in").order("created_at"),
    reservationsWith(filter)
      .lt("check_out", today)
      .order("check_in", { ascending: false })
      .limit(PAST_LIMIT),
  ]);
  if (upcoming.error) throw new Error(`Loading reservations failed: ${upcoming.error.message}`);
  if (past.error) throw new Error(`Loading reservations failed: ${past.error.message}`);

  const apartmentNames = new Map(apartments.map((apartment) => [apartment.id, apartment.name]));
  return {
    upcoming: upcoming.data.map((row) => toAdminReservation(row, apartmentNames)),
    past: past.data.map((row) => toAdminReservation(row, apartmentNames)),
  };
}

/** Requests that still wait for the owner. Old ones (the stay is over) are not counted. */
export async function countPendingReservations(today: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .gte("check_out", today);
  if (error) throw new Error(`Counting pending reservations failed: ${error.message}`);
  return count ?? 0;
}
