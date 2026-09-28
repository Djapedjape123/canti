"use client";

import { useState } from "react";
import { isSelectable, nextSelection, type SelectionContext } from "@/lib/calendar-selection";
import type { Dictionary } from "@/lib/dictionaries";
import { addDays, monthGrid } from "@/lib/dates";
import { fill, formatDateLong, formatMonthYear, formatPrice } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { basePriceForNight, type BasePrices } from "@/lib/pricing";
import { Icon } from "@/components/ui/Icon";

// Selection rules (exclusive check_out, no jumping over booked nights, max 30 nights)
// live in lib/calendar-selection.ts. Price overrides come with Day 3.

type BookingCalendarProps = {
  lang: Locale;
  labels: Dictionary["booking"];
  prices: BasePrices;
  /** 'YYYY-MM-DD' in Europe/Belgrade, from the server */
  today: string;
  /** End of the availability window (exclusive), from the server */
  until: string;
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
  /** Booked nights (Booking iCal, later also our reservations). */
  blocked: ReadonlySet<string>;
};

function monthOf(date: string): { year: number; month: number } {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

export function BookingCalendar({
  lang,
  labels,
  prices,
  today,
  until,
  checkIn,
  checkOut,
  onChange,
  blocked,
}: BookingCalendarProps) {
  const [view, setView] = useState(() => monthOf(checkIn ?? today));
  const currentMonth = monthOf(today);
  const lastMonth = monthOf(addDays(until, -1));
  const canGoBack = view.year > currentMonth.year || view.month > currentMonth.month;
  const canGoForward = view.year * 12 + view.month < lastMonth.year * 12 + lastMonth.month;

  const ctx: SelectionContext = { today, until, blocked };
  const selection = { checkIn, checkOut };

  const shift = (step: number) => {
    setView(({ year, month }) => {
      const index = year * 12 + (month - 1) + step;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  };

  const select = (date: string) => {
    const next = nextSelection(selection, date, ctx);
    onChange(next.checkIn, next.checkOut);
  };

  const cells = monthGrid(view.year, view.month);

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label={labels.previousMonth}
          className="grid size-11 place-items-center rounded-full text-ink-900 transition-colors hover:bg-cream-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Icon name="chevronLeft" className="size-5" strokeWidth={1.75} />
        </button>
        <p className="font-serif text-xl font-semibold capitalize text-ink-900" aria-live="polite">
          {formatMonthYear(view.year, view.month, lang)}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoForward}
          aria-label={labels.nextMonth}
          className="grid size-11 place-items-center rounded-full text-ink-900 transition-colors hover:bg-cream-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Icon name="chevronRight" className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-600">
        {labels.weekdays.map((day) => (
          <span key={day} aria-hidden="true" className="py-2">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} aria-hidden="true" />;

          const isBlocked = blocked.has(date);
          const selectable = isSelectable(date, selection, ctx);
          const isStart = date === checkIn;
          const isEnd = date === checkOut;
          const inRange = Boolean(checkIn && checkOut && date > checkIn && date < checkOut);
          const selected = isStart || isEnd || inRange;
          // A booked night can still be our check-out day (the other guest arrives that day).
          const checkOutOnly = isBlocked && (selectable || isEnd);
          const priced = !isBlocked && date >= today && date < until;
          const price = basePriceForNight(date, prices);

          let tone = "text-ink-900 hover:bg-cream-100";
          if (isStart || isEnd) tone = "bg-brand-800 text-cream-50";
          else if (inRange) tone = "bg-cream-100 text-ink-900 rounded-none";
          else if (isBlocked && !selectable) tone = "text-ink-600/50 line-through bg-sand-200/40";
          else if (!selectable) tone = "text-ink-600/40";

          const status = isBlocked
            ? checkOutOnly
              ? labels.checkOutOnly
              : labels.booked
            : priced
              ? formatPrice(price, lang)
              : null;

          return (
            <button
              key={date}
              type="button"
              disabled={!selectable}
              onClick={() => select(date)}
              aria-pressed={selected}
              aria-label={status ? `${formatDateLong(date, lang)}, ${status}` : formatDateLong(date, lang)}
              className={`flex min-h-12 flex-col items-center justify-center rounded-lg text-sm transition-colors disabled:cursor-not-allowed md:min-h-14 ${tone}`}
            >
              <span className="font-medium">{Number(date.slice(8))}</span>
              {priced ? (
                // On mobile the price is shown only on selected days (space).
                <span
                  className={`text-[10px] leading-none ${selected ? "" : "hidden md:block"} ${
                    isStart || isEnd ? "text-cream-50/80" : "text-ink-600"
                  }`}
                >
                  {price}€
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-600">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm ring-1 ring-sand-200" />
          {labels.legendFree}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm bg-sand-200" />
          {labels.legendBooked}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-sm bg-brand-800" />
          {labels.legendSelected}
        </li>
      </ul>

      {checkIn && !checkOut ? (
        <p className="mt-3 text-xs text-ink-600">{fill(labels.selected, { from: formatDateLong(checkIn, lang), to: "…" })}</p>
      ) : null}
    </div>
  );
}
