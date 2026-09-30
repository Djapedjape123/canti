"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  addMonths,
  commonPrice,
  formatLongDate,
  formatMonthTitle,
  formatYearMonth,
  guestReservationInRange,
  isInRange,
  NO_SELECTION,
  nextDaySelection,
  rangeSummary,
  selectedRange,
  type DaySelection,
  type LoadedWindow,
  type NightReservation,
  type NightStatus,
  type NightStatuses,
  type YearMonth,
} from "@/lib/admin-calendar";
import { adminText } from "@/lib/admin-text";
import { monthGrid } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { priceForNight, type BasePrices, type PriceOverrides } from "@/lib/pricing";
import { PriceEditorSheet } from "./PriceEditorSheet";

const t = adminText.calendar;

/** How long "Sačuvano ✓" stays on screen. */
const NOTICE_MS = 6_000;

type DayStatus = NightStatus | "free";

// Full class names (not built from parts), so Tailwind finds them.
const DAY_FILL: Record<DayStatus, string> = {
  free: "bg-white",
  booking: "bg-status-booking",
  pending: "bg-status-pending",
  confirmed: "bg-status-confirmed",
  blocked: "bg-status-blocked",
};

const LEGEND: DayStatus[] = ["free", "booking", "pending", "confirmed", "blocked"];

type AdminCalendarProps = {
  apartments: { slug: string; name: string }[];
  apartment: { slug: string; name: string; prices: BasePrices };
  /** The owner's prices for single days in the loaded window. */
  overrides: PriceOverrides;
  /** Who holds each night in the loaded window; a free night has no entry. */
  statuses: NightStatuses;
  /** Which pending/confirmed reservation holds each night (for "Otkaži rezervaciju"). */
  guestReservations: Record<string, NightReservation>;
  /** Booking.com could not be read: its nights may be missing from `statuses`. */
  bookingUnavailable: boolean;
  loaded: LoadedWindow;
  shown: YearMonth;
  /** 'YYYY-MM-DD' in Europe/Belgrade, from the server. */
  today: string;
};

/**
 * Month view of one apartment: price and status of every day. Tap a day (and
 * then a last day) to open the editor (price, block, unblock). Months and
 * apartments change through the URL (?apartment=…&month=…), so the server
 * loads their data; the picked days stay picked while the owner moves between months.
 */
export function AdminCalendar({
  apartments,
  apartment,
  overrides,
  statuses,
  guestReservations,
  bookingUnavailable,
  loaded,
  shown,
  today,
}: AdminCalendarProps) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [selection, setSelection] = useState<DaySelection>(NO_SELECTION);
  const [notice, setNotice] = useState<string | null>(null);
  const range = selectedRange(selection);
  const monthTitle = formatMonthTitle(shown);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function show(slug: string, month: YearMonth) {
    const query = new URLSearchParams({ apartment: slug, month: formatYearMonth(month) });
    startNavigation(() => router.replace(`/admin/kalendar?${query}`, { scroll: false }));
  }

  function pick(day: string) {
    setNotice(null);
    setSelection((current) => nextDaySelection(current, day));
  }

  function finish(message: string) {
    setSelection(NO_SELECTION);
    setNotice(message);
    // Loads the new prices and statuses from the server; the change shows right away.
    router.refresh();
  }

  return (
    // While the sheet is open on a phone, extra space at the bottom keeps the last rows reachable.
    <div
      className={`mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 ${range ? "pb-[26rem] lg:pb-0" : ""}`}
    >
      <div className="min-w-0 rounded-xl bg-cream-50 p-2 shadow-sm ring-1 ring-sand-200 sm:p-5">
        {apartments.length > 1 ? (
          <label className="block px-1">
            <span className="text-sm font-semibold text-ink-900">{t.apartment}</span>
            <select
              value={apartment.slug}
              onChange={(event) => show(event.target.value, shown)}
              className="mt-1 min-h-11 w-full rounded-lg border border-sand-200 bg-white px-3 text-base text-ink-900"
            >
              {apartments.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="px-1 text-sm font-semibold text-ink-600">{apartment.name}</p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => show(apartment.slug, addMonths(shown, -1))}
            aria-label={t.previousMonth}
            className="grid size-11 shrink-0 place-items-center rounded-full text-ink-900 hover:bg-cream-100"
          >
            <Icon name="chevronLeft" className="size-5" strokeWidth={1.75} />
          </button>
          <h2 className="font-serif text-2xl font-semibold text-ink-900" aria-live="polite">
            {monthTitle}
          </h2>
          <button
            type="button"
            onClick={() => show(apartment.slug, addMonths(shown, 1))}
            aria-label={t.nextMonth}
            className="grid size-11 shrink-0 place-items-center rounded-full text-ink-900 hover:bg-cream-100"
          >
            <Icon name="chevronRight" className="size-5" strokeWidth={1.75} />
          </button>
        </div>

        {bookingUnavailable ? (
          <p role="status" className="mx-1 mt-2 rounded-lg bg-status-booking px-3 py-2 text-sm leading-relaxed text-ink-900">
            {t.bookingUnavailable}
          </p>
        ) : null}

        <div
          aria-hidden="true"
          className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-600"
        >
          {t.weekdays.map((day) => (
            <span key={day} className="py-1">
              {day}
            </span>
          ))}
        </div>

        <div
          role="group"
          aria-label={monthTitle}
          aria-busy={isNavigating}
          className={`grid grid-cols-7 gap-0.5 sm:gap-1 ${isNavigating ? "opacity-60" : ""}`}
        >
          {monthGrid(shown.year, shown.month).map((date, index) => {
            if (!date) return <span key={`empty-${index}`} aria-hidden="true" />;

            const price = priceForNight(date, apartment.prices, overrides);
            const special = Object.hasOwn(overrides, date);
            const status: DayStatus = Object.hasOwn(statuses, date) ? statuses[date] : "free";
            const past = date < today;
            const isToday = date === today;
            const selected = isInRange(date, range);
            const edge = selected && (date === range?.from || date === range?.to);

            // The fill shows who holds the night; past days are muted but can still be picked.
            const fill = DAY_FILL[status];
            let tone = `${fill} text-ink-900 ring-1 ring-sand-200 hover:ring-brand-800`;
            if (edge) tone = "bg-brand-800 text-cream-50 ring-1 ring-brand-800";
            else if (selected) tone = `${status === "free" ? "bg-brand-800/10" : fill} text-ink-900 ring-2 ring-brand-800`;
            else if (past) tone = `${status === "free" ? "" : fill} text-ink-600 ring-1 ring-sand-200/70 hover:ring-brand-800`;

            const description = [
              formatLongDate(date),
              formatPrice(price, "sr"),
              t.nightStatus[status],
              special ? t.specialPrice : null,
              isToday ? t.today : null,
              past ? t.pastDay : null,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <button
                key={date}
                type="button"
                onClick={() => pick(date)}
                aria-pressed={selected}
                aria-label={description}
                className={`relative flex min-h-13 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 ${tone}`}
              >
                <span
                  className={`text-sm leading-none ${
                    isToday ? "font-bold underline decoration-gold-500 decoration-2 underline-offset-4" : "font-medium"
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                <span
                  className={`text-[11px] leading-none ${special ? "font-bold" : ""} ${
                    edge ? "text-cream-50" : special ? "text-ink-900" : "text-ink-600"
                  }`}
                >
                  {price}€
                </span>
                {special ? (
                  <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-gold-500" />
                ) : null}
              </button>
            );
          })}
        </div>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-ink-600">
          {LEGEND.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`size-3 rounded-sm ring-1 ring-sand-200 ${DAY_FILL[status]}`} />
              {t.nightStatus[status]}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-full bg-gold-500" />
            <span>
              <strong className="text-ink-900">120€</strong> {t.legendSpecial}
            </span>
          </li>
        </ul>

        <p className="mt-4 border-t border-sand-200 px-1 pt-3 text-sm leading-relaxed text-ink-600">
          {t.basePrices}: {t.weekday} {formatPrice(apartment.prices.priceWeekday, "sr")} · {t.friday}{" "}
          {formatPrice(apartment.prices.priceFriday, "sr")} · {t.saturday}{" "}
          {formatPrice(apartment.prices.priceSaturday, "sr")}.{" "}
          <Link href="/admin/podesavanja" className="inline-block font-semibold text-brand-800 underline underline-offset-2">
            {t.changeBasePrices}
          </Link>
        </p>
      </div>

      <PriceEditorSheet
        key={range ? `${range.from}_${range.to}` : "idle"}
        apartmentSlug={apartment.slug}
        range={range}
        waitingForLastDay={selection.start !== null && selection.end === null}
        initialPrice={range ? commonPrice(range, apartment.prices, overrides, loaded) : null}
        summary={range ? rangeSummary(range, statuses, today, loaded) : null}
        guestReservation={range ? guestReservationInRange(range, guestReservations) : null}
        notice={notice}
        onCancel={() => setSelection(NO_SELECTION)}
        onDone={finish}
      />
    </div>
  );
}
