import { z } from "zod";
import { isIsoDate, nightsBetween } from "./dates";

// zod schemas for every API input. The messages are in Serbian because they
// reach the owner (and later guests); an API route answers with the first one.

export const MIN_PRICE = 1;
export const MAX_PRICE = 10_000;
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

export type SetPricesInput = z.infer<typeof setPricesSchema>;
export type ResetPricesInput = z.infer<typeof resetPricesSchema>;
export type BasePricesPatch = z.infer<typeof basePricesPatchSchema>;
