import { revalidatePath } from "next/cache";
import { blockPlan, clipToToday, nightsOfDays, type NightRange } from "@/lib/admin-blocks";
import { requireAdmin } from "@/lib/admin-auth";
import { adminText } from "@/lib/admin-text";
import { EXCLUSION_VIOLATION, jsonError, logError, readJson, validationError } from "@/lib/api";
import { getApartmentBySlug, type Apartment } from "@/lib/apartments";
import { getBookingRanges, type BookingRange } from "@/lib/booking-ical";
import { todayInBelgrade } from "@/lib/dates";
import { getReservationRanges } from "@/lib/reservations";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { blockDatesSchema } from "@/lib/validation";

// The owner closes dates (a `blocked` reservation without a guest) and opens them again.
// `to` is INCLUDED: the owner picks days, and a blocked day is a closed night,
// so the days 10–12 are the nights of the 10th, 11th and 12th (check_out = 13th).
// Booking.com dates are never blocked or unblocked here: we only read them.

const e = adminText.blocks.errors;

type BlockRequest = { apartment: Apartment; nights: NightRange };

/**
 * What PUT and DELETE check first: the owner, the body, the apartment.
 * Days before today are cut off. A Response means: answer with it and stop.
 */
async function readBlockRequest(request: Request): Promise<BlockRequest | Response> {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const parsed = blockDatesSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const { slug, from, to } = parsed.data;

  const apartment = await getApartmentBySlug(slug);
  if (!apartment) return jsonError(adminText.api.apartmentNotFound, 404);

  const upcoming = clipToToday({ from, to }, todayInBelgrade());
  if (!upcoming) return jsonError(e.pastDays, 422);
  return { apartment, nights: nightsOfDays(upcoming) };
}

/**
 * PUT { slug, from, to }: blocks every free night of those days.
 * Nights taken on Booking or by our own reservations are skipped.
 * Answers { blockedNights, skippedBooking, skippedReserved }.
 */
export async function PUT(request: Request) {
  try {
    const checked = await readBlockRequest(request);
    if (checked instanceof Response) return checked;
    const { apartment, nights } = checked;

    // Booking without cache: a night sold there a minute ago must not be blocked
    // by us, or our iCal export would send it back to Booking. If we cannot
    // check, we refuse, like a guest's reservation.
    let bookingRanges: BookingRange[];
    try {
      bookingRanges = await getBookingRanges(apartment.slug, { fresh: true });
    } catch (error) {
      logError("PUT /api/admin/blocks (Booking calendar)", error);
      return jsonError(e.bookingUnavailable, 503);
    }
    const ownRanges = await getReservationRanges(apartment.id, nights.start, nights.end);

    const plan = blockPlan(nights, bookingRanges, ownRanges);
    if (plan.runs.length === 0) return jsonError(e.nothingToBlock, 409);

    // One insert for all runs: either every block is saved or none is.
    const rows = plan.runs.map((run) => ({
      apartment_id: apartment.id,
      check_in: run.start,
      check_out: run.end,
      status: "blocked" as const,
      source: "admin" as const,
    }));
    const { error } = await getSupabaseAdmin().from("reservations").insert(rows);
    if (error) {
      // A guest took one of these nights between our check and the insert.
      if (error.code === EXCLUSION_VIOLATION) return jsonError(e.takenMeanwhile, 409);
      logError("PUT /api/admin/blocks", error);
      return jsonError(adminText.api.saveFailed, 500);
    }

    // Every page is rebuilt on its next visit, so the public calendar shows the block.
    revalidatePath("/", "layout");
    const { blockedNights, skippedBooking, skippedReserved } = plan;
    return Response.json({ blockedNights, skippedBooking, skippedReserved });
  } catch (error) {
    logError("PUT /api/admin/blocks", error);
    return jsonError(adminText.api.saveFailed, 500);
  }
}

/**
 * DELETE { slug, from, to }: removes our blocks on those days; a block that
 * goes on past them is shortened or split. Guests and Booking stay as they are.
 * Answers { unblockedNights }.
 */
export async function DELETE(request: Request) {
  try {
    const checked = await readBlockRequest(request);
    if (checked instanceof Response) return checked;
    const { apartment, nights } = checked;

    // One Postgres function, one transaction (supabase/migrations/0002_unblock_nights.sql).
    // Booking is not needed here: its dates are not in our table.
    const { data: unblockedNights, error } = await getSupabaseAdmin().rpc("unblock_nights", {
      p_apartment_id: apartment.id,
      p_from: nights.start,
      p_to: nights.end,
    });
    if (error) {
      logError("DELETE /api/admin/blocks", error);
      return jsonError(adminText.api.saveFailed, 500);
    }
    if (unblockedNights === 0) return jsonError(e.nothingToUnblock, 409);

    revalidatePath("/", "layout");
    return Response.json({ unblockedNights });
  } catch (error) {
    logError("DELETE /api/admin/blocks", error);
    return jsonError(adminText.api.saveFailed, 500);
  }
}
