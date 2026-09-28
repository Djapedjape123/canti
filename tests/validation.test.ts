import { describe, expect, it } from "vitest";
import {
  basePricesPatchSchema,
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

  it.each(["2026-02-30", "2026-2-3", "31.12.2026", "", "2026-12-31T00:00:00Z"])("refuses the date %j", (date) => {
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
