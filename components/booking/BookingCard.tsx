"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { Dictionary } from "@/lib/dictionaries";
import { fill, formatDateShort, formatPrice } from "@/lib/format";
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
  slug: string;
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
  /** 1 … max_guests of this apartment, with labels ("2 gosta"). */
  guestOptions: { value: number; label: string }[];
  initialGuests: number;
};

/** What POST /api/reservations answers with 201. */
type SentRequest = { check_in: string; check_out: string; nightsCount: number; total: number };

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; message: string }
  | { kind: "sent"; request: SentRequest };

const fieldClass =
  "mt-1.5 block min-h-11 w-full rounded-lg border border-sand-200 bg-white px-3 text-base text-ink-900 transition-colors focus:border-brand-800 focus:outline-none";
const labelClass = "block text-sm font-medium text-ink-900";

function errorFrom(body: unknown): string | null {
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : null;
}

/**
 * Booking card: calendar, price preview and the request form.
 * The guest sends only dates and contact details; the server computes the price.
 */
export function BookingCard({
  lang,
  labels,
  whatsappLabel,
  whatsappHref,
  slug,
  prices,
  overrides,
  fromPrice,
  today,
  until,
  blocked,
  initialCheckIn,
  initialCheckOut,
  guestOptions,
  initialGuests,
}: BookingCardProps) {
  const router = useRouter();
  const [range, setRange] = useState({ checkIn: initialCheckIn, checkOut: initialCheckOut });
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guests, setGuests] = useState(initialGuests);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  const blockedSet = useMemo(() => new Set(blocked ?? []), [blocked]);
  const stayQuote =
    range.checkIn && range.checkOut ? quote(range.checkIn, range.checkOut, prices, overrides) : null;
  const sending = submit.kind === "sending";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!range.checkIn || !range.checkOut || sending) return;
    setSubmit({ kind: "sending" });
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          check_in: range.checkIn,
          check_out: range.checkOut,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          guests,
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setSubmit({ kind: "error", message: errorFrom(body) ?? labels.errorNetwork });
        return;
      }
      setSubmit({ kind: "sent", request: body as SentRequest });
    } catch {
      setSubmit({ kind: "error", message: labels.errorNetwork });
    }
  };

  const startOver = () => {
    setRange({ checkIn: null, checkOut: null });
    setSubmit({ kind: "idle" });
    // Reload the booked nights from the server: the dates just requested are now taken.
    router.refresh();
  };

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

      {submit.kind === "sent" ? (
        <div role="status" className="mt-5">
          <p className="flex items-center gap-2 font-serif text-2xl font-semibold text-ink-900">
            <Icon name="check" className="size-6 text-brand-800" />
            {labels.successTitle}
          </p>
          <div className="mt-4 rounded-lg bg-cream-100 p-4 text-ink-900">
            <p className="font-medium">
              {fill(labels.selected, {
                from: formatDateShort(submit.request.check_in, lang),
                to: formatDateShort(submit.request.check_out, lang),
              })}
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold">{formatPrice(submit.request.total, lang)}</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">{labels.successBody}</p>
          <button type="button" onClick={startOver} className={buttonClasses("dark", "mt-5 w-full")}>
            {labels.bookAgain}
          </button>
          {whatsappButton}
        </div>
      ) : blocked === null ? (
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
              onChange={(checkIn, checkOut) => {
                setRange({ checkIn, checkOut });
                if (submit.kind === "error") setSubmit({ kind: "idle" });
              }}
            />
          </div>

          {stayQuote ? (
            <div className="mt-5">
              <PriceBreakdown lang={lang} labels={labels} nights={stayQuote.nights} total={stayQuote.total} />
            </div>
          ) : null}

          {/* autoComplete="off": Firefox otherwise restores the submit button's disabled state after a
              reload and React reports a hydration mismatch. The inputs keep their own autocomplete. */}
          <form onSubmit={onSubmit} autoComplete="off" className="mt-5 grid gap-4">
            <label className={labelClass}>
              {labels.guestName}
              <input
                type="text"
                name="guest_name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={guestName}
                onChange={(event) => setGuestName(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              {labels.guestPhone}
              <input
                type="tel"
                name="guest_phone"
                autoComplete="tel"
                inputMode="tel"
                required
                minLength={6}
                maxLength={30}
                value={guestPhone}
                onChange={(event) => setGuestPhone(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              {labels.guestEmail}
              <input
                type="email"
                name="guest_email"
                autoComplete="email"
                required
                maxLength={254}
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              {labels.guests}
              <select
                name="guests"
                value={guests}
                onChange={(event) => setGuests(Number(event.target.value))}
                className={fieldClass}
              >
                {guestOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {submit.kind === "error" ? (
              <p
                role="alert"
                className="rounded-lg border border-sand-200 bg-cream-100 px-3 py-2 text-sm font-semibold text-ink-900"
              >
                {submit.message}
              </p>
            ) : null}

            <div>
              <button
                type="submit"
                disabled={!stayQuote || sending}
                aria-busy={sending}
                className={buttonClasses("dark", "w-full")}
              >
                {sending ? labels.submitting : labels.submit}
              </button>
              <p className="mt-3 text-center text-xs text-ink-600">
                {stayQuote ? labels.requestNote : labels.pickDatesFirst}
              </p>
            </div>
          </form>

          <div className="mt-5 rounded-lg border border-sand-200 p-4">
            <p className="text-sm leading-relaxed text-ink-600">{labels.orWhatsapp}</p>
            {whatsappButton}
          </div>
        </>
      )}
    </div>
  );
}
