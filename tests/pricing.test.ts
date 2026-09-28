import { describe, expect, it } from "vitest";
import { lowestBasePrice, priceForNight, quote, type BasePrices, type PriceOverrides } from "@/lib/pricing";

// De Lux base prices. Calendar: Mon 28 Sep 2026 … Fri 2 Oct, Sat 3 Oct, Sun 4 Oct.
const base: BasePrices = { priceWeekday: 65, priceFriday: 75, priceSaturday: 79 };
const none: PriceOverrides = {};

describe("priceForNight", () => {
  it.each([
    { date: "2026-09-28", day: "Monday", price: 65 },
    { date: "2026-09-29", day: "Tuesday", price: 65 },
    { date: "2026-09-30", day: "Wednesday", price: 65 },
    { date: "2026-10-01", day: "Thursday", price: 65 },
    { date: "2026-10-02", day: "Friday", price: 75 },
    { date: "2026-10-03", day: "Saturday", price: 79 },
    { date: "2026-10-04", day: "Sunday", price: 65 },
  ])("$day night ($date) costs $price €", ({ date, price }) => {
    expect(priceForNight(date, base, none)).toBe(price);
  });

  it("an override beats the Friday price", () => {
    expect(priceForNight("2026-10-02", base, { "2026-10-02": 90 })).toBe(90);
  });

  it("an override beats the Saturday and the weekday price", () => {
    const overrides = { "2026-10-03": 120, "2026-10-05": 50 };
    expect(priceForNight("2026-10-03", base, overrides)).toBe(120);
    expect(priceForNight("2026-10-05", base, overrides)).toBe(50);
  });

  it("an override changes only its own night", () => {
    const overrides = { "2026-10-02": 90 };
    expect(priceForNight("2026-10-03", base, overrides)).toBe(79);
    expect(priceForNight("2026-10-09", base, overrides)).toBe(75); // the next Friday
  });
});

describe("quote", () => {
  it("weekend: Fri + Sat + Sun = 75 + 79 + 65 = 219", () => {
    const result = quote("2026-10-02", "2026-10-05", base, none);
    expect(result.nights).toEqual([
      { date: "2026-10-02", price: 75 },
      { date: "2026-10-03", price: 79 },
      { date: "2026-10-04", price: 65 },
    ]);
    expect(result.nightsCount).toBe(3);
    expect(result.total).toBe(219);
  });

  it("uses an override in the middle of the stay", () => {
    const result = quote("2026-10-05", "2026-10-08", base, { "2026-10-06": 100 });
    expect(result.nights.map((night) => night.price)).toEqual([65, 100, 65]);
    expect(result.total).toBe(230);
  });

  it("one night", () => {
    expect(quote("2026-10-07", "2026-10-08", base, none)).toEqual({
      nights: [{ date: "2026-10-07", price: 65 }],
      nightsCount: 1,
      total: 65,
    });
    expect(quote("2026-10-03", "2026-10-04", base, none).total).toBe(79);
  });

  it("never charges the check-out day, not even when it has an override", () => {
    const result = quote("2026-10-02", "2026-10-04", base, { "2026-10-04": 500 });
    expect(result.nights.map((night) => night.date)).toEqual(["2026-10-02", "2026-10-03"]);
    expect(result.total).toBe(154);
  });

  it("crosses into the next month", () => {
    const result = quote("2026-10-30", "2026-11-02", base, none);
    expect(result.nights).toEqual([
      { date: "2026-10-30", price: 75 },
      { date: "2026-10-31", price: 79 },
      { date: "2026-11-01", price: 65 },
    ]);
    expect(result.total).toBe(219);
  });

  it("crosses the new year with overrides on 31 Dec and 1 Jan", () => {
    const overrides = { "2026-12-31": 120, "2027-01-01": 120 };
    const result = quote("2026-12-30", "2027-01-02", base, overrides);
    expect(result.nights).toEqual([
      { date: "2026-12-30", price: 65 }, // Wednesday
      { date: "2026-12-31", price: 120 }, // Thursday, override
      { date: "2027-01-01", price: 120 }, // Friday, the override beats 75
    ]);
    expect(result.total).toBe(305);
  });

  it("counts every night across the switch to winter time (Sun 25 Oct 2026)", () => {
    // In Belgrade 25 Oct has 25 hours. Date math runs in UTC (lib/dates.ts),
    // so no night is added or lost, whatever the machine's time zone is.
    const result = quote("2026-10-24", "2026-10-27", base, none);
    expect(result.nights).toEqual([
      { date: "2026-10-24", price: 79 }, // Saturday
      { date: "2026-10-25", price: 65 }, // Sunday, clocks go back
      { date: "2026-10-26", price: 65 }, // Monday
    ]);
    expect(result.nightsCount).toBe(3);
    expect(result.total).toBe(209);
  });

  it("gives 0 nights when check-out is not after check-in", () => {
    expect(quote("2026-10-05", "2026-10-05", base, none)).toEqual({ nights: [], nightsCount: 0, total: 0 });
    expect(quote("2026-10-06", "2026-10-05", base, none).nightsCount).toBe(0);
  });

  it("nightsCount matches the nights for the longest stay (30 nights)", () => {
    const result = quote("2026-11-01", "2026-12-01", base, none);
    expect(result.nightsCount).toBe(30);
    expect(result.nights).toHaveLength(30);
    expect(result.nights.at(-1)?.date).toBe("2026-11-30");
  });
});

describe("lowestBasePrice", () => {
  it("is the lowest of the three base prices", () => {
    expect(lowestBasePrice(base)).toBe(65);
    expect(lowestBasePrice({ priceWeekday: 70, priceFriday: 60, priceSaturday: 80 })).toBe(60);
  });
});
