import { getApartmentBySlug, getPriceOverrides } from "@/lib/apartments";
import { EXCLUSION_VIOLATION, jsonError, logError, readJson, validationError } from "@/lib/api";
import { nightsFromRanges } from "@/lib/availability";
import { getBookingRanges, type BookingRange } from "@/lib/booking-ical";
import { sendGuestReservationEmail, sendOwnerReservationEmail } from "@/lib/email";
import { quote } from "@/lib/pricing";
import { checkRateLimit, ipFromHeaders } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createReservationSchema, reservationMessages, validationMessages } from "@/lib/validation";

/**
 * POST { slug, check_in, check_out, guest_name, guest_email, guest_phone, guests }
 * A guest's reservation request. It is saved as `pending`, so the dates are
 * taken right away, and the owner confirms or cancels it in the admin panel.
 */
export async function POST(request: Request) {
  try {
    if (!checkRateLimit(ipFromHeaders(request.headers))) {
      return jsonError(reservationMessages.tooManyRequests, 429);
    }

    const parsed = createReservationSchema.safeParse(await readJson(request));
    if (!parsed.success) return validationError(parsed.error, 422);
    const { slug, check_in, check_out, guest_name, guest_email, guest_phone, guests } = parsed.data;

    const apartment = await getApartmentBySlug(slug);
    if (!apartment) return jsonError(validationMessages.slug, 422);
    if (guests > apartment.maxGuests) return jsonError(reservationMessages.guestsExceeded, 422);

    // Booking.com without cache, right before saving. If we cannot check it,
    // we refuse: a reservation is never accepted blind.
    let bookingRanges: BookingRange[];
    try {
      bookingRanges = await getBookingRanges(apartment.slug, { fresh: true });
    } catch (error) {
      logError("POST /api/reservations (Booking calendar)", error);
      return jsonError(reservationMessages.bookingUnavailable, 503);
    }
    if (nightsFromRanges(bookingRanges, check_in, check_out).length > 0) {
      return jsonError(reservationMessages.overlap, 409);
    }

    // The price is always computed here; the browser never sends one.
    const overrides = await getPriceOverrides(apartment.id, check_in, check_out);
    const stay = quote(check_in, check_out, apartment, overrides);

    const { data, error } = await getSupabaseAdmin()
      .from("reservations")
      .insert({
        apartment_id: apartment.id,
        check_in,
        check_out,
        guest_name,
        guest_email,
        guest_phone,
        guests,
        total_price: stay.total,
        status: "pending",
        source: "website",
      })
      .select("id")
      .single();
    if (error) {
      // Another request took these dates a moment ago: the database refuses the overlap.
      if (error.code === EXCLUSION_VIOLATION) return jsonError(reservationMessages.overlap, 409);
      logError("POST /api/reservations (insert)", error);
      return jsonError(reservationMessages.reservationFailed, 500);
    }

    // Awaited so they finish before the serverless function stops; neither can throw.
    const details = {
      apartmentName: apartment.name,
      checkIn: check_in,
      checkOut: check_out,
      nightsCount: stay.nightsCount,
      total: stay.total,
      guestName: guest_name,
      guestEmail: guest_email,
      guestPhone: guest_phone,
      guests,
    };
    await Promise.all([sendOwnerReservationEmail(details), sendGuestReservationEmail(details)]);

    return Response.json(
      { id: data.id, check_in, check_out, nightsCount: stay.nightsCount, total: stay.total },
      { status: 201 },
    );
  } catch (error) {
    logError("POST /api/reservations", error);
    return jsonError(reservationMessages.reservationFailed, 500);
  }
}
