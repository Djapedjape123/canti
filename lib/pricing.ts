import { addDays, dayOfWeek } from "./dates";

// Pure pricing functions, shared by the server (quotes, reservations) and the
// booking calendar in the browser. The server always recalculates the price;
// a price sent by the browser is never trusted.

export type BasePrices = {
  priceWeekday: number;
  priceFriday: number;
  priceSaturday: number;
};

/**
 * Prices the owner set for single nights: { 'YYYY-MM-DD': price }.
 * The key is the date the night STARTS (from the price_overrides table).
 */
export type PriceOverrides = Readonly<Record<string, number>>;

export type NightPrice = { date: string; price: number };

export type Quote = {
  nights: NightPrice[];
  nightsCount: number;
  total: number;
};

/**
 * Price of the night that STARTS on `date` (Friday night = Friday → Saturday).
 * Order: the owner's price for that date, then Friday, then Saturday, then weekday.
 */
export function priceForNight(date: string, base: BasePrices, overrides: PriceOverrides): number {
  if (Object.hasOwn(overrides, date)) return overrides[date];
  const day = dayOfWeek(date);
  if (day === 5) return base.priceFriday;
  if (day === 6) return base.priceSaturday;
  return base.priceWeekday;
}

/**
 * Every night in [checkIn, checkOut) with its price, plus the total.
 * check_out is exclusive: 2 → 5 = the nights of the 2nd, 3rd and 4th,
 * so the check-out day is never charged. checkIn >= checkOut gives 0 nights;
 * the 1–30 night limit is checked by the caller.
 */
export function quote(
  checkIn: string,
  checkOut: string,
  base: BasePrices,
  overrides: PriceOverrides,
): Quote {
  const nights: NightPrice[] = [];
  for (let date = checkIn; date < checkOut; date = addDays(date, 1)) {
    nights.push({ date, price: priceForNight(date, base, overrides) });
  }
  return {
    nights,
    nightsCount: nights.length,
    total: nights.reduce((sum, night) => sum + night.price, 0),
  };
}

/** "From X € / night" = the lowest of the three base prices (overrides are ignored). */
export function lowestBasePrice(prices: BasePrices): number {
  return Math.min(prices.priceWeekday, prices.priceFriday, prices.priceSaturday);
}
