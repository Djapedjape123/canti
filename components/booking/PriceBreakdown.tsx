import type { Dictionary } from "@/lib/dictionaries";
import { plural } from "@/lib/plural";
import { formatPrice, formatWeekdayShort } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { NightPrice } from "@/lib/pricing";

type PriceBreakdownProps = {
  lang: Locale;
  labels: Dictionary["booking"];
  nights: NightPrice[];
  total: number;
};

/** "3 noći · 219 €" + one line per night (pet 75 €, sub 79 €, ned 65 €). */
export function PriceBreakdown({ lang, labels, nights, total }: PriceBreakdownProps) {
  const nightsLabel = plural(lang, nights.length, {
    one: labels.nightsOne,
    few: labels.nightsFew,
    many: labels.nightsFew,
  });

  return (
    <div className="rounded-lg bg-cream-100 p-4">
      <p className="flex items-baseline justify-between gap-4 text-ink-900">
        <span className="font-medium">{nightsLabel}</span>
        <span className="font-serif text-2xl font-semibold">{formatPrice(total, lang)}</span>
      </p>
      <ul className="mt-3 grid gap-1 border-t border-sand-200 pt-3 text-sm text-ink-600">
        {nights.map((night) => (
          <li key={night.date} className="flex justify-between gap-4">
            <span>
              <span className="capitalize">{formatWeekdayShort(night.date, lang)}</span>{" "}
              {Number(night.date.slice(8))}.{Number(night.date.slice(5, 7))}.
            </span>
            <span>{formatPrice(night.price, lang)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
