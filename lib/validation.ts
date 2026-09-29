import { z } from "zod";
import { isIsoDate, nightsBetween, todayInBelgrade } from "./dates";
import { MAX_PRICE, MIN_PRICE } from "./pricing";

// zod schemas for every API input. The messages are in Serbian because they
// reach the owner (and later guests); an API route answers with the first one.

/** The owner can change at most this many days in one save (a leap year). */
export const MAX_ADMIN_RANGE_DAYS = 366;

export const validationMessages = {
  invalidRequest: "Neispravan zahtev.",
  slug: "Nepoznat apartman.",
  date: "Datum mora biti u obliku GGGG-MM-DD.",
  rangeOrder: "Prvi dan ne sme biti posle poslednjeg.",
  rangeLength: `Najviše ${MAX_ADMIN_RANGE_DAYS} dana odjednom.`,
  price: "Cena mora biti ceo broj od 1 do 10.000 €.",
  noPrice: "Pošaljite bar jednu cenu.",
  guestName: "Unesite ime i prezime.",
  guestEmail: "Unesite ispravnu mejl adresu.",
  guestPhone: "Unesite ispravan broj telefona.",
  guests: "Unesite broj gostiju (najmanje 1).",
  nightsRange: "Rezervacija je moguća za 1 do 30 noći.",
  checkInPast: "Datum dolaska ne može biti u prošlosti.",
  reservationStatus: "Status može biti samo potvrđena ili otkazana.",
} as const;

/** Outcomes of POST /api/reservations that are not about one field's format. */
export const reservationMessages = {
  guestsExceeded: "Apartman ne prima toliko gostiju.",
  overlap: "Nažalost, ovaj termin je upravo zauzet. Izaberite druge datume.",
  bookingUnavailable: "Trenutno ne možemo da proverimo dostupnost. Pokušajte ponovo za par minuta ili nas pozovite.",
  tooManyRequests: "Previše zahteva. Pokušajte ponovo za par minuta.",
  reservationFailed: "Rezervacija nije uspela. Pokušajte ponovo ili nas pozovite.",
} as const;

const m = validationMessages;

/** Same rule as the check in the database: lowercase letters, digits, single dashes. */
export const slugSchema = z
  .string({ error: m.slug })
  .max(64, m.slug)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, m.slug);

/** A real calendar date as 'YYYY-MM-DD' (2026-02-30 is refused). */
export const isoDateSchema = z
  .string({ error: m.date })
  // abort: a broken date stops here, so the range checks below never see it.
  .refine(isIsoDate, { error: m.date, abort: true });

/** Whole euros per night. */
export const priceSchema = z.int({ error: m.price }).min(MIN_PRICE, m.price).max(MAX_PRICE, m.price);

type DayRange = { from: string; to: string };

// Admin ranges are days, so `to` is INCLUDED: from = to is one day.
const fromNotAfterTo = (range: DayRange) => range.from <= range.to;
const withinMaxDays = (range: DayRange) => nightsBetween(range.from, range.to) + 1 <= MAX_ADMIN_RANGE_DAYS;

/** PUT /api/admin/prices: the same price for every day from `from` to `to`. */
export const setPricesSchema = z
  .object({ slug: slugSchema, from: isoDateSchema, to: isoDateSchema, price: priceSchema }, { error: m.invalidRequest })
  .refine(fromNotAfterTo, { error: m.rangeOrder, path: ["to"] })
  .refine(withinMaxDays, { error: m.rangeLength, path: ["to"] });

/** DELETE /api/admin/prices: those days go back to the base price. */
export const resetPricesSchema = z
  .object({ slug: slugSchema, from: isoDateSchema, to: isoDateSchema }, { error: m.invalidRequest })
  .refine(fromNotAfterTo, { error: m.rangeOrder, path: ["to"] })
  .refine(withinMaxDays, { error: m.rangeLength, path: ["to"] });

/** PATCH /api/admin/apartments/[slug]: any of the three base prices, at least one. */
export const basePricesPatchSchema = z
  .object(
    {
      price_weekday: priceSchema.optional(),
      price_friday: priceSchema.optional(),
      price_saturday: priceSchema.optional(),
    },
    { error: m.invalidRequest },
  )
  .refine((prices) => Object.values(prices).some((price) => price !== undefined), { error: m.noPrice });

export const MIN_NIGHTS = 1;
export const MAX_NIGHTS = 30;
/** Only a sanity cap; the apartment's own max_guests is checked in the route. */
export const MAX_GUESTS_ABSOLUTE = 20;

const guestNameSchema = z.string({ error: m.guestName }).trim().min(2, m.guestName).max(120, m.guestName);
const guestEmailSchema = z.email({ error: m.guestEmail }).max(254, m.guestEmail);
const guestPhoneSchema = z
  .string({ error: m.guestPhone })
  .trim()
  .min(6, m.guestPhone)
  .max(30, m.guestPhone)
  .regex(/^\+?[0-9\s()/-]+$/, m.guestPhone);
const guestsSchema = z.int({ error: m.guests }).min(1, m.guests).max(MAX_GUESTS_ABSOLUTE, m.guests);

type Stay = { check_in: string; check_out: string };

// check_out is exclusive, so nightsBetween is the number of nights slept.
const validNightsCount = (stay: Stay) => {
  const nights = nightsBetween(stay.check_in, stay.check_out);
  return nights >= MIN_NIGHTS && nights <= MAX_NIGHTS;
};
// "Today" is evaluated on every parse, in Europe/Belgrade, not once at startup.
const checkInNotInPast = (stay: Stay) => stay.check_in >= todayInBelgrade();

/** POST /api/reservations: what the guest sends. The price is never part of it. */
export const createReservationSchema = z
  .object(
    {
      slug: slugSchema,
      check_in: isoDateSchema,
      check_out: isoDateSchema,
      guest_name: guestNameSchema,
      guest_email: guestEmailSchema,
      guest_phone: guestPhoneSchema,
      guests: guestsSchema,
    },
    { error: m.invalidRequest },
  )
  .refine(validNightsCount, { error: m.nightsRange, path: ["check_out"] })
  .refine(checkInNotInPast, { error: m.checkInPast, path: ["check_in"] });

/** The [id] in /api/admin/reservations/[id]. Anything that is not a uuid cannot exist. */
export const reservationIdSchema = z.uuid();

/** PATCH /api/admin/reservations/[id]: the owner confirms or cancels. */
export const reservationStatusPatchSchema = z.object(
  { status: z.enum(["confirmed", "cancelled"], { error: m.reservationStatus }) },
  { error: m.invalidRequest },
);

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type SetPricesInput = z.infer<typeof setPricesSchema>;
export type ResetPricesInput = z.infer<typeof resetPricesSchema>;
export type BasePricesPatch = z.infer<typeof basePricesPatchSchema>;
export type ReservationStatusPatch = z.infer<typeof reservationStatusPatchSchema>;
