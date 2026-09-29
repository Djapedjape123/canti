import { adminText } from "./admin-text";
import { nightsBetween, parseIsoDate } from "./dates";
import { plural } from "./plural";
import type { ReservationSource, ReservationStatus } from "./supabase/types";

// Pure logic of the admin reservation list (app/admin/(panel)/rezervacije).
// Loading from the database is in lib/reservations.ts.

/** Serbian in Latin script. Plain "sr-RS" gives Cyrillic month names. */
const DATE_LOCALE = "sr-Latn-RS";

/** How many past reservations the list shows, newest first. Upcoming ones are never cut. */
export const PAST_LIMIT = 30;

/** One reservation as the admin list shows it. Guest fields are empty on blocks. */
export type AdminReservation = {
  id: string;
  apartmentName: string;
  checkIn: string;
  /** Exclusive: the guest leaves on this day, the night is free again. */
  checkOut: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  guests: number | null;
  totalPrice: number | null;
  status: ReservationStatus;
  source: ReservationSource;
  /** ISO timestamp (timestamptz) of when the request came in. */
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Filter: ?status=pending|confirmed|blocked|cancelled|all
// ---------------------------------------------------------------------------

export const STATUS_FILTERS = ["pending", "confirmed", "blocked", "cancelled", "all"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** The owner opens the list to answer new requests, so those come first. */
export const DEFAULT_STATUS_FILTER: StatusFilter = "pending";

/** Anything unknown (also a missing or repeated ?status) → the default filter. */
export function parseStatusFilter(value: unknown): StatusFilter {
  return STATUS_FILTERS.find((filter) => filter === value) ?? DEFAULT_STATUS_FILTER;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const t = adminText.reservations;

const stayDayFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// created_at is a moment in time, not a calendar date: show it as Novi Sad sees it.
const receivedDateFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Belgrade",
});
const receivedTimeFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Belgrade",
});

/** '2026-10-02' → "pet 2. okt", with " 2027." added when the year is not this year. */
function stayDay(date: string, currentYear: string): string {
  const label = stayDayFormat.format(parseIsoDate(date));
  const year = date.slice(0, 4);
  return year === currentYear ? label : `${label} ${year}.`;
}

/**
 * "pet 2. okt – ned 4. okt": arrival and departure day, as the guest sees them.
 * The departure day is check_out itself (the guest does not sleep that night).
 */
export function formatStayDates(checkIn: string, checkOut: string, today: string): string {
  const currentYear = today.slice(0, 4);
  return `${stayDay(checkIn, currentYear)} – ${stayDay(checkOut, currentYear)}`;
}

/** "2 noći" */
export function nightsLabel(checkIn: string, checkOut: string): string {
  return plural("sr", nightsBetween(checkIn, checkOut), {
    one: t.nightsOne,
    few: t.nightsFew,
    many: t.nightsMany,
  });
}

/** "2 gosta" */
export function guestsLabel(guests: number): string {
  return plural("sr", guests, { one: t.guestsOne, few: t.guestsFew, many: t.guestsMany });
}

/** '2026-09-29T12:32:00Z' → "29. sep 2026. u 14:32" (Belgrade time, summer or winter). */
export function formatReceivedAt(createdAt: string): string {
  const instant = new Date(createdAt);
  return `${receivedDateFormat.format(instant)} u ${receivedTimeFormat.format(instant)}`;
}

/**
 * A short note for stays that matter today, else null.
 * Only for guests who are coming (pending or confirmed): a block or a
 * cancelled request needs no reminder.
 */
export function stayNote(
  reservation: Pick<AdminReservation, "checkIn" | "checkOut" | "status">,
  today: string,
): string | null {
  const { checkIn, checkOut, status } = reservation;
  if (status !== "pending" && status !== "confirmed") return null;
  if (checkIn === today) return t.arrivesToday;
  // check_out is exclusive: on that day the guest leaves, the night is not theirs.
  if (checkOut === today) return t.leavesToday;
  if (checkIn < today && today < checkOut) return t.inProgress;
  return null;
}
