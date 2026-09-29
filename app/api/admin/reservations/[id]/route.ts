import { requireAdmin } from "@/lib/admin-auth";
import { statusChangeError, type StatusChange } from "@/lib/admin-reservations";
import { adminText } from "@/lib/admin-text";
import { jsonError, logError, readJson, validationError } from "@/lib/api";
import { getApartments } from "@/lib/apartments";
import { nightsBetween, todayInBelgrade } from "@/lib/dates";
import { sendGuestCancelledEmail, sendGuestConfirmedEmail } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ReservationRow } from "@/lib/supabase/types";
import { reservationIdSchema, reservationStatusPatchSchema } from "@/lib/validation";

const WHERE = "PATCH /api/admin/reservations/[id]";

type LoadedReservation = Pick<
  ReservationRow,
  "id" | "apartment_id" | "check_in" | "check_out" | "guest_name" | "guest_email" | "guests" | "total_price" | "status"
>;

/**
 * PATCH { status: 'confirmed' | 'cancelled' }
 * The owner confirms a request or cancels a reservation; the guest gets an email.
 * Answers { id, status, guestNotified }. guestNotified is false when there was
 * no email to send (a block, a phone guest without email) or sending failed.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/reservations/[id]">) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    // In Next.js 16 params is a Promise.
    const { id } = await ctx.params;
    const validId = reservationIdSchema.safeParse(id);
    if (!validId.success) return jsonError(adminText.api.reservationNotFound, 404);

    const parsed = reservationStatusPatchSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const next = parsed.data.status;

    const supabase = getSupabaseAdmin();
    const { data: reservation, error: loadError } = await supabase
      .from("reservations")
      .select("id, apartment_id, check_in, check_out, guest_name, guest_email, guests, total_price, status")
      .eq("id", validId.data)
      .maybeSingle();
    if (loadError) {
      logError(WHERE, loadError);
      return jsonError(adminText.api.saveFailed, 500);
    }
    if (!reservation) return jsonError(adminText.api.reservationNotFound, 404);

    const refused = statusChangeError(reservation.status, next, reservation.check_out, todayInBelgrade());
    if (refused) return jsonError(refused, 409);

    // Changes the row only if its status is still the one read above, so a
    // double tap or a second open tab cannot confirm twice (and email twice).
    const { data: updated, error: updateError } = await supabase
      .from("reservations")
      .update({ status: next })
      .eq("id", reservation.id)
      .eq("status", reservation.status)
      .select("id");
    if (updateError) {
      logError(WHERE, updateError);
      return jsonError(adminText.api.saveFailed, 500);
    }
    if (updated.length === 0) return jsonError(adminText.reservations.changeErrors.changedMeanwhile, 409);

    // After the save: a failed email never undoes the confirmation or the cancellation.
    const guestNotified = await notifyGuest(reservation, next);
    return Response.json({ id: reservation.id, status: next, guestNotified });
  } catch (error) {
    logError(WHERE, error);
    return jsonError(adminText.api.saveFailed, 500);
  }
}

/** true when the guest got an email about the change. */
async function notifyGuest(reservation: LoadedReservation, next: StatusChange): Promise<boolean> {
  // A block has no guest, and a phone guest may have left no email.
  if (reservation.status === "blocked" || !reservation.guest_email) return false;

  const apartments = await getApartments();
  const details = {
    apartmentName: apartments.find((apartment) => apartment.id === reservation.apartment_id)?.name ?? "",
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    nightsCount: nightsBetween(reservation.check_in, reservation.check_out),
    total: reservation.total_price,
    guestName: reservation.guest_name,
    guestEmail: reservation.guest_email,
    guests: reservation.guests,
  };
  return next === "confirmed"
    ? sendGuestConfirmedEmail(details)
    : sendGuestCancelledEmail(details, reservation.status === "confirmed");
}
