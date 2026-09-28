"use client";

import { useMemo, useState } from "react";
import type { Dictionary } from "@/lib/dictionaries";
import { formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { quote, type BasePrices, type PriceOverrides } from "@/lib/pricing";
import { buttonClasses } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { BookingCalendar } from "./BookingCalendar";
import { PriceBreakdown } from "./PriceBreakdown";

type BookingCardProps = {
  lang: Locale;
  labels: Dictionary["booking"];
  whatsappLabel: string;
  whatsappHref: string;
  prices: BasePrices;
  /** The owner's prices for single nights in the availability window (from the server). */
  overrides: PriceOverrides;
  fromPrice: number;
  today: string;
  /** End of the availability window (exclusive) */
  until: string;
  /** Booked nights from the server; null when the Booking calendar could not be read. */
  blocked: string[] | null;
  initialCheckIn: string | null;
  initialCheckOut: string | null;
};

/**
 * Booking card: calendar + price preview.
 * Sending the request is switched on with /api/reservations (Day 5);
 * until then the button is disabled and guests are pointed to WhatsApp.
 */
export function BookingCard({
  lang,
  labels,
  whatsappLabel,
  whatsappHref,
  prices,
  overrides,
  fromPrice,
  today,
  until,
  blocked,
  initialCheckIn,
  initialCheckOut,
}: BookingCardProps) {
  const [range, setRange] = useState({ checkIn: initialCheckIn, checkOut: initialCheckOut });
  const blockedSet = useMemo(() => new Set(blocked ?? []), [blocked]);
  const stayQuote =
    range.checkIn && range.checkOut ? quote(range.checkIn, range.checkOut, prices, overrides) : null;

  const whatsappButton = (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses("outline-dark", "mt-3 w-full")}
    >
      <Icon name="whatsapp" className="size-5" strokeWidth={1.5} />
      {whatsappLabel}
    </a>
  );

  return (
    <div className="rounded-xl bg-cream-50 p-5 shadow-sm ring-1 ring-sand-200 md:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-2xl font-semibold text-ink-900">{labels.title}</h2>
        <p className="text-sm text-ink-600">
          {labels.from}{" "}
          <span className="font-serif text-xl font-semibold text-ink-900">{formatPrice(fromPrice, lang)}</span>{" "}
          {labels.perNight}
        </p>
      </div>
      <span aria-hidden="true" className="mt-3 block h-px w-16 bg-gold-500" />

      {blocked === null ? (
        <div role="status" className="mt-5 rounded-lg border border-sand-200 p-4">
          <p className="text-sm leading-relaxed text-ink-900">{labels.calendarUnavailable}</p>
          {whatsappButton}
        </div>
      ) : (
        <>
          <div className="mt-5">
            <BookingCalendar
              lang={lang}
              labels={labels}
              prices={prices}
              overrides={overrides}
              today={today}
              until={until}
              blocked={blockedSet}
              checkIn={range.checkIn}
              checkOut={range.checkOut}
              onChange={(checkIn, checkOut) => setRange({ checkIn, checkOut })}
            />
          </div>

          {stayQuote ? (
            <div className="mt-5">
              <PriceBreakdown lang={lang} labels={labels} nights={stayQuote.nights} total={stayQuote.total} />
            </div>
          ) : null}

          <button type="button" disabled className={buttonClasses("dark", "mt-5 w-full")}>
            {labels.submit}
          </button>
          <p className="mt-3 text-center text-xs text-ink-600">{labels.requestNote}</p>

          <div className="mt-5 rounded-lg border border-sand-200 p-4">
            <p className="text-sm leading-relaxed text-ink-600">{labels.previewNote}</p>
            {whatsappButton}
          </div>
        </>
      )}
    </div>
  );
}
