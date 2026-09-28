import { describe, expect, it } from "vitest";
import {
  addMonths,
  commonPrice,
  dayCount,
  formatLongDate,
  formatMonthTitle,
  formatYearMonth,
  isInRange,
  loadedWindow,
  NO_SELECTION,
  nextDaySelection,
  parsePriceInput,
  parseYearMonth,
  rangeLabel,
  selectedRange,
  type DaySelection,
} from "@/lib/admin-calendar";
import type { BasePrices } from "@/lib/pricing";

const base: BasePrices = { priceWeekday: 65, priceFriday: 75, priceSaturday: 79 };

/** Taps the days one after another, like the owner would. */
function tap(...days: string[]): DaySelection {
  return days.reduce(nextDaySelection, NO_SELECTION);
}

describe("months", () => {
  it("reads ?month=YYYY-MM and refuses anything else", () => {
    expect(parseYearMonth("2026-12")).toEqual({ year: 2026, month: 12 });
    for (const value of ["2026-13", "2026-00", "2026-1", "26-12", "2026-12-01", "", undefined, ["2026-12"]]) {
      expect(parseYearMonth(value)).toBeNull();
    }
  });

  it("moves across years in both directions", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
    expect(addMonths({ year: 2026, month: 10 }, 12)).toEqual({ year: 2027, month: 10 });
    expect(formatYearMonth({ year: 2027, month: 1 })).toBe("2027-01");
  });

  it("loads the month before, the month shown and the month after", () => {
    expect(loadedWindow({ year: 2026, month: 12 })).toEqual({ from: "2026-11-01", until: "2027-02-01" });
    expect(loadedWindow({ year: 2027, month: 1 })).toEqual({ from: "2026-12-01", until: "2027-03-01" });
  });
});

describe("picking days", () => {
  it("the first tap already selects that one day", () => {
    expect(tap("2026-12-31")).toEqual({ start: "2026-12-31", end: null });
    expect(selectedRange(tap("2026-12-31"))).toEqual({ from: "2026-12-31", to: "2026-12-31" });
  });

  it("the second tap makes a range, in either direction", () => {
    expect(selectedRange(tap("2026-12-31", "2027-01-02"))).toEqual({ from: "2026-12-31", to: "2027-01-02" });
    expect(selectedRange(tap("2027-01-02", "2026-12-31"))).toEqual({ from: "2026-12-31", to: "2027-01-02" });
  });

  it("the same day twice is one day", () => {
    expect(selectedRange(tap("2026-12-31", "2026-12-31"))).toEqual({ from: "2026-12-31", to: "2026-12-31" });
  });

  it("a tap after a finished range starts a new one", () => {
    expect(tap("2026-12-31", "2027-01-02", "2026-12-05")).toEqual({ start: "2026-12-05", end: null });
  });

  it("nothing selected, nothing to edit", () => {
    expect(selectedRange(NO_SELECTION)).toBeNull();
    expect(isInRange("2026-12-31", null)).toBe(false);
  });

  it("counts days with both ends: 31 Dec – 2 Jan is 3 days", () => {
    const range = { from: "2026-12-31", to: "2027-01-02" };
    expect(dayCount(range)).toBe(3);
    expect(isInRange("2026-12-31", range)).toBe(true);
    expect(isInRange("2027-01-02", range)).toBe(true);
    expect(isInRange("2027-01-03", range)).toBe(false);
  });
});

describe("labels", () => {
  it("shows a range the way the owner reads it", () => {
    expect(rangeLabel({ from: "2026-12-31", to: "2027-01-02" })).toBe("31. dec – 2. jan · 3 dana");
    expect(rangeLabel({ from: "2026-12-31", to: "2026-12-31" })).toBe("31. dec · 1 dan");
  });

  it("uses Serbian plural forms for days", () => {
    expect(rangeLabel({ from: "2026-10-01", to: "2026-10-02" })).toMatch(/· 2 dana$/);
    expect(rangeLabel({ from: "2026-10-01", to: "2026-10-05" })).toMatch(/· 5 dana$/);
    expect(rangeLabel({ from: "2026-10-01", to: "2026-10-21" })).toMatch(/· 21 dan$/);
  });

  it("is written in Latin script, not Cyrillic", () => {
    expect(formatMonthTitle({ year: 2026, month: 12 })).toBe("Decembar 2026");
    expect(formatLongDate("2026-12-31")).toBe("četvrtak, 31. decembar 2026.");
  });
});

describe("prices in the editor", () => {
  const loaded = { from: "2026-11-01", until: "2027-02-01" };

  it("prefills the price all selected days share", () => {
    expect(commonPrice({ from: "2026-12-28", to: "2026-12-31" }, base, {}, loaded)).toBe(65); // Mon–Thu
    const overrides = { "2026-12-31": 120, "2027-01-01": 120 };
    expect(commonPrice({ from: "2026-12-31", to: "2027-01-01" }, base, overrides, loaded)).toBe(120);
  });

  it("leaves the input empty when the days differ", () => {
    expect(commonPrice({ from: "2027-01-01", to: "2027-01-02" }, base, {}, loaded)).toBeNull(); // Fri 75, Sat 79
  });

  it("leaves the input empty when a day is outside the loaded months", () => {
    expect(commonPrice({ from: "2026-10-26", to: "2026-11-02" }, base, {}, loaded)).toBeNull();
    expect(commonPrice({ from: "2027-01-28", to: "2027-02-01" }, base, {}, loaded)).toBeNull();
  });

  it("reads what the owner typed", () => {
    expect(parsePriceInput("120")).toBe(120);
    expect(parsePriceInput(" 120 € ")).toBe(120);
    expect(parsePriceInput("1")).toBe(1);
    expect(parsePriceInput("10000")).toBe(10_000);
  });

  it("refuses anything that is not a whole price from 1 to 10.000 €", () => {
    for (const text of ["", "0", "10001", "12.5", "12,5", "-5", "abc", "1e3", "120 eur"]) {
      expect(parsePriceInput(text)).toBeNull();
    }
  });
});
