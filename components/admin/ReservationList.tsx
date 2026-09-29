import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import {
  formatReceivedAt,
  formatStayDates,
  guestsLabel,
  nightsLabel,
  STATUS_FILTERS,
  stayNote,
  type AdminReservation,
  type StatusFilter,
} from "@/lib/admin-reservations";
import { adminText } from "@/lib/admin-text";
import { fill, formatPrice } from "@/lib/format";
import type { ReservationStatus } from "@/lib/supabase/types";

const t = adminText.reservations;

// Full class names (not built from parts), so Tailwind finds them.
const STATUS_BADGE: Record<ReservationStatus, string> = {
  pending: "bg-status-pending text-ink-900",
  confirmed: "bg-status-confirmed text-ink-900",
  blocked: "bg-status-blocked text-ink-900",
  cancelled: "text-ink-600 ring-1 ring-inset ring-sand-200",
};

/** Tabs above the list. Plain links: the server filters, no JavaScript needed. */
export function ReservationFilters({ current }: { current: StatusFilter }) {
  return (
    <nav aria-label={t.filterLabel} className="-mx-4 mt-5 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = filter === current;
          return (
            <li key={filter}>
              <Link
                href={`/admin/rezervacije?status=${filter}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${
                  active
                    ? "bg-brand-800 text-cream-50"
                    : "bg-cream-50 text-ink-900 ring-1 ring-inset ring-sand-200 hover:bg-white"
                }`}
              >
                {t.filters[filter]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type ReservationListProps = {
  reservations: AdminReservation[];
  /** 'YYYY-MM-DD' in Europe/Belgrade, from the server. */
  today: string;
};

export function ReservationList({ reservations, today }: ReservationListProps) {
  return (
    <ul className="mt-3 grid gap-3">
      {reservations.map((reservation) => (
        <li key={reservation.id}>
          <ReservationCard reservation={reservation} today={today} />
        </li>
      ))}
    </ul>
  );
}

function ReservationCard({ reservation, today }: { reservation: AdminReservation; today: string }) {
  const { id, status, guestName, guestPhone, guestEmail, guests, totalPrice } = reservation;
  const titleId = `reservation-${id}`;
  const note = stayNote(reservation, today);
  const isBlock = status === "blocked";

  return (
    <article aria-labelledby={titleId} className="rounded-xl bg-cream-50 p-4 shadow-sm ring-1 ring-sand-200 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 id={titleId} className="font-serif text-xl font-semibold leading-tight text-ink-900">
            {formatStayDates(reservation.checkIn, reservation.checkOut, today)}
          </h3>
          <p className="mt-1 text-sm text-ink-600">
            {nightsLabel(reservation.checkIn, reservation.checkOut)}
            {reservation.apartmentName ? ` · ${reservation.apartmentName}` : null}
          </p>
        </div>
        <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[status]}`}>
          {t.status[status]}
        </span>
      </div>

      {note ? (
        <p className="mt-3 inline-flex rounded-full bg-brand-800 px-3 py-1 text-xs font-semibold text-cream-50">
          {note}
        </p>
      ) : null}

      {isBlock ? (
        <p className="mt-3 text-sm text-ink-600">{t.blockedDates}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-sand-200 pt-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">
              {guestName ?? t.noGuestName}
              {guests ? <span className="font-normal text-ink-600"> · {guestsLabel(guests)}</span> : null}
            </p>
            {guestPhone || guestEmail ? (
              <ul className="mt-1">
                {guestPhone ? (
                  <li>
                    <a
                      href={`tel:${guestPhone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-800 underline-offset-2 hover:underline"
                    >
                      <Icon name="phone" className="size-5 shrink-0" strokeWidth={1.5} />
                      {guestPhone}
                    </a>
                  </li>
                ) : null}
                {guestEmail ? (
                  <li>
                    <a
                      href={`mailto:${guestEmail}`}
                      className="inline-flex min-h-11 items-center gap-2 break-all font-semibold text-brand-800 underline-offset-2 hover:underline"
                    >
                      <Icon name="mail" className="size-5 shrink-0" strokeWidth={1.5} />
                      {guestEmail}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
          {totalPrice !== null ? (
            <p className="text-right">
              <span className="block text-xs uppercase tracking-[0.2em] text-ink-600">{t.total}</span>
              <span className="font-serif text-2xl font-semibold text-ink-900">{formatPrice(totalPrice, "sr")}</span>
            </p>
          ) : null}
        </div>
      )}

      <p className="mt-3 text-xs text-ink-600">
        {t.source[reservation.source]} · {fill(t.received, { date: formatReceivedAt(reservation.createdAt) })}
      </p>
    </article>
  );
}
