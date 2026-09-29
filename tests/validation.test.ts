import { describe, expect, it } from "vitest";
import { addDays, todayInBelgrade } from "@/lib/dates";
import {
  basePricesPatchSchema,
  blockDatesSchema,
  createReservationSchema,
  reservationIdSchema,
  reservationStatusPatchSchema,
  resetPricesSchema,
  setPricesSchema,
  slugSchema,
  validationMessages as m,
} from "@/lib/validation";

/** The message an API route would send back (the first issue), or null when valid. */
function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }): string | null {
  return result.success ? null : (result.error?.issues[0]?.message ?? "?");
}

const valid = { slug: "de-lux", from: "2026-12-31", to: "2027-01-02", price: 120 };

describe("setPricesSchema (PUT /api/admin/prices)", () => {
  it("accepts a range of days with a price", () => {
    expect(setPricesSchema.parse(valid)).toEqual(valid);
  });

  it("accepts a single day (from = to)", () => {
    expect(firstError(setPricesSchema.safeParse({ ...valid, to: valid.from }))).toBeNull();
  });

  it("refuses `from` after `to`", () => {
    expect(firstError(setPricesSchema.safeParse({ ...valid, from: "2027-01-03" }))).toBe(m.rangeOrder);
  });

  it("allows at most 366 days", () => {
    expect(firstError(setPricesSchema.safeParse({ ...valid, from: "2028-01-01", to: "2028-12-31" }))).toBeNull();
    expect(firstError(setPricesSchema.safeParse({ ...valid, from: "2026-01-01", to: "2027-01-01" }))).toBeNull();
    expect(firstError(setPricesSchema.safeParse({ ...valid, from: "2026-01-01", to: "2027-01-02" }))).toBe(
      m.rangeLength,
    );
  });

  it.each(["2026-02-30", "2026-13-01", "2026-2-3", "31.12.2026", "", "2026-12-31T00:00:00Z"])("refuses the date %j", (date) => {
    expect(firstError(setPricesSchema.safeParse({ ...valid, from: date }))).toBe(m.date);
  });

  it.each([0, -5, 10_001, 12.5, "120", null])("refuses the price %j", (price) => {
    expect(firstError(setPricesSchema.safeParse({ ...valid, price }))).toBe(m.price);
  });

  it("refuses a missing price", () => {
    const withoutPrice = { slug: valid.slug, from: valid.from, to: valid.to };
    expect(firstError(setPricesSchema.safeParse(withoutPrice))).toBe(m.price);
  });

  it("accepts the lowest and the highest price", () => {
    expect(firstError(setPricesSchema.safeParse({ ...valid, price: 1 }))).toBeNull();
    expect(firstError(setPricesSchema.safeParse({ ...valid, price: 10_000 }))).toBeNull();
  });

  it("refuses a body that is not an object (for example invalid JSON)", () => {
    expect(firstError(setPricesSchema.safeParse(undefined))).toBe(m.invalidRequest);
    expect(firstError(setPricesSchema.safeParse("de-lux"))).toBe(m.invalidRequest);
  });
});

describe("slugSchema", () => {
  it.each(["de-lux", "apartman-2", "a1"])("accepts %j", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  it.each(["De Lux", "de_lux", "-de-lux", "de--lux", "../etc", "", 5])("refuses %j", (slug) => {
    expect(firstError(slugSchema.safeParse(slug))).toBe(m.slug);
  });
});

describe("resetPricesSchema (DELETE /api/admin/prices)", () => {
  it("accepts a range and drops fields it does not know (like price)", () => {
    expect(resetPricesSchema.parse({ ...valid, extra: true })).toStrictEqual({
      slug: "de-lux",
      from: "2026-12-31",
      to: "2027-01-02",
    });
  });

  it("uses the same range rules", () => {
    expect(firstError(resetPricesSchema.safeParse({ ...valid, from: "2027-01-03" }))).toBe(m.rangeOrder);
  });
});

describe("blockDatesSchema (PUT and DELETE /api/admin/blocks)", () => {
  const range = { slug: "de-lux", from: "2026-12-31", to: "2027-01-02" };

  it("accepts a range of days and a single day", () => {
    expect(blockDatesSchema.parse(range)).toStrictEqual(range);
    expect(firstError(blockDatesSchema.safeParse({ ...range, to: range.from }))).toBeNull();
  });

  it("refuses a wrong order, a broken date, an unknown slug and a missing body", () => {
    expect(firstError(blockDatesSchema.safeParse({ ...range, from: "2027-01-03" }))).toBe(m.rangeOrder);
    expect(firstError(blockDatesSchema.safeParse({ ...range, to: "2027-02-30" }))).toBe(m.date);
    expect(firstError(blockDatesSchema.safeParse({ ...range, slug: "De Lux" }))).toBe(m.slug);
    expect(firstError(blockDatesSchema.safeParse(undefined))).toBe(m.invalidRequest);
  });
});

describe("basePricesPatchSchema (PATCH /api/admin/apartments/[slug])", () => {
  it("accepts one, two or all three prices", () => {
    expect(basePricesPatchSchema.parse({ price_friday: 80 })).toEqual({ price_friday: 80 });
    expect(basePricesPatchSchema.parse({ price_weekday: 65, price_friday: 75, price_saturday: 79 })).toEqual({
      price_weekday: 65,
      price_friday: 75,
      price_saturday: 79,
    });
  });

  it("refuses an empty change", () => {
    expect(firstError(basePricesPatchSchema.safeParse({}))).toBe(m.noPrice);
  });

  it("refuses a wrong price in any field", () => {
    expect(firstError(basePricesPatchSchema.safeParse({ price_weekday: 0 }))).toBe(m.price);
    expect(firstError(basePricesPatchSchema.safeParse({ price_saturday: "79" }))).toBe(m.price);
  });
});

describe("createReservationSchema (POST /api/reservations)", () => {
  // Dates relative to today, so the tests never go stale.
  const today = todayInBelgrade();
  const checkIn = addDays(today, 30);
  const reservation = {
    slug: "de-lux",
    check_in: checkIn,
    check_out: addDays(checkIn, 3),
    guest_name: "Petar Petrović",
    guest_email: "petar@example.com",
    guest_phone: "+381 60 123 4567",
    guests: 2,
  };

  it("accepts a valid request", () => {
    expect(createReservationSchema.parse(reservation)).toEqual(reservation);
  });

  it("drops a price sent by the browser", () => {
    expect(createReservationSchema.parse({ ...reservation, total_price: 1 })).not.toHaveProperty("total_price");
  });

  it("trims the name and the phone", () => {
    const parsed = createReservationSchema.parse({ ...reservation, guest_name: "  Ana  ", guest_phone: " 0601234567 " });
    expect(parsed.guest_name).toBe("Ana");
    expect(parsed.guest_phone).toBe("0601234567");
  });

  it("accepts check-in today and refuses yesterday", () => {
    expect(firstError(createReservationSchema.safeParse({ ...reservation, check_in: today, check_out: addDays(today, 1) }))).toBeNull();
    const yesterday = addDays(today, -1);
    expect(
      firstError(createReservationSchema.safeParse({ ...reservation, check_in: yesterday, check_out: addDays(yesterday, 2) })),
    ).toBe(m.checkInPast);
  });

  it("accepts 1 and 30 nights", () => {
    expect(firstError(createReservationSchema.safeParse({ ...reservation, check_out: addDays(checkIn, 1) }))).toBeNull();
    expect(firstError(createReservationSchema.safeParse({ ...reservation, check_out: addDays(checkIn, 30) }))).toBeNull();
  });

  it("refuses 0 nights, check-out before check-in and more than 30 nights", () => {
    expect(firstError(createReservationSchema.safeParse({ ...reservation, check_out: checkIn }))).toBe(m.nightsRange);
    expect(firstError(createReservationSchema.safeParse({ ...reservation, check_out: addDays(checkIn, -2) }))).toBe(
      m.nightsRange,
    );
    expect(firstError(createReservationSchema.safeParse({ ...reservation, check_out: addDays(checkIn, 31) }))).toBe(
      m.nightsRange,
    );
  });

  it("refuses a date that does not exist", () => {
    expect(firstError(createReservationSchema.safeParse({ ...reservation, check_in: "2027-02-30" }))).toBe(m.date);
  });

  it.each(["", " ", "A", null, 5])("refuses the name %j", (guest_name) => {
    expect(firstError(createReservationSchema.safeParse({ ...reservation, guest_name }))).toBe(m.guestName);
  });

  it.each(["petar", "petar@", "@example.com", "", null])("refuses the email %j", (guest_email) => {
    expect(firstError(createReservationSchema.safeParse({ ...reservation, guest_email }))).toBe(m.guestEmail);
  });

  it.each(["123", "phone me", "060-abc-123", "", null])("refuses the phone %j", (guest_phone) => {
    expect(firstError(createReservationSchema.safeParse({ ...reservation, guest_phone }))).toBe(m.guestPhone);
  });

  it.each([0, -1, 1.5, 21, "2", null])("refuses the guest count %j", (guests) => {
    expect(firstError(createReservationSchema.safeParse({ ...reservation, guests }))).toBe(m.guests);
  });

  it("refuses an unknown apartment slug and a body that is not an object", () => {
    expect(firstError(createReservationSchema.safeParse({ ...reservation, slug: "De Lux" }))).toBe(m.slug);
    expect(firstError(createReservationSchema.safeParse(undefined))).toBe(m.invalidRequest);
  });
});

describe("reservationStatusPatchSchema (PATCH /api/admin/reservations/[id])", () => {
  it("accepts confirmed and cancelled", () => {
    expect(reservationStatusPatchSchema.parse({ status: "confirmed" })).toEqual({ status: "confirmed" });
    expect(reservationStatusPatchSchema.parse({ status: "cancelled" })).toEqual({ status: "cancelled" });
  });

  it.each(["pending", "blocked", "CONFIRMED", "", null, undefined])("refuses the status %j", (status) => {
    expect(firstError(reservationStatusPatchSchema.safeParse({ status }))).toBe(m.reservationStatus);
  });

  it("refuses a body that is not an object", () => {
    expect(firstError(reservationStatusPatchSchema.safeParse(undefined))).toBe(m.invalidRequest);
  });
});

describe("reservationIdSchema", () => {
  it("accepts a uuid and refuses anything else", () => {
    expect(reservationIdSchema.safeParse("3f0c2a4e-8b1d-4c7a-9e2f-5a6b7c8d9e0f").success).toBe(true);
    for (const id of ["", "123", "not-a-uuid", "3f0c2a4e-8b1d-4c7a-9e2f-5a6b7c8d9e0"]) {
      expect(reservationIdSchema.safeParse(id).success).toBe(false);
    }
  });
});
