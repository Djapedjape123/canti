import { addDays, dayOfWeek } from "./dates";

export type BasePrices = {
  priceWeekday: number;
  priceFriday: number;
  priceSaturday: number;
};

/**
 * Base price for the night that STARTS on `date`
 * (Friday night = Friday→Saturday). Price overrides come later.
 */
export function basePriceForNight(date: string, prices: BasePrices): number {
  const day = dayOfWeek(date);
  if (day === 5) return prices.priceFriday;
  if (day === 6) return prices.priceSaturday;
  return prices.priceWeekday;
}

export type NightPrice = { date: string; price: number };

/**
 * Price per night for [checkIn, checkOut) using base prices only.
 * check_out is exclusive: 2 → 5 = nights of the 2nd, 3rd and 4th.
 * TODO: price_overrides from the database (Day 3), then this is used by /api/quote.
 */
export function quoteFromBasePrices(
  checkIn: string,
  checkOut: string,
  prices: BasePrices,
): { nights: NightPrice[]; total: number } {
  const nights: NightPrice[] = [];
  for (let date = checkIn; date < checkOut; date = addDays(date, 1)) {
    nights.push({ date, price: basePriceForNight(date, prices) });
  }
  return { nights, total: nights.reduce((sum, night) => sum + night.price, 0) };
}

/** "From X € / night" = the lowest of the three base prices. */
export function lowestBasePrice(prices: BasePrices): number {
  return Math.min(prices.priceWeekday, prices.priceFriday, prices.priceSaturday);
}
