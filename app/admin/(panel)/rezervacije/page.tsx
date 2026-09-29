import type { Metadata } from "next";
import Link from "next/link";
import { ReservationFilters, ReservationList } from "@/components/admin/ReservationList";
import { ReservationNoticeProvider } from "@/components/admin/ReservationNotice";
import { requireAdminPage } from "@/lib/admin-auth";
import { PAST_LIMIT, parseStatusFilter } from "@/lib/admin-reservations";
import { adminText } from "@/lib/admin-text";
import { todayInBelgrade } from "@/lib/dates";
import { fill } from "@/lib/format";
import { getReservationsForAdmin } from "@/lib/reservations";

const t = adminText.reservations;

export const metadata: Metadata = { title: adminText.nav.reservations };

// ?status=pending|confirmed|blocked|cancelled|all (default: pending).
// Potvrdi / Otkaži on the cards send PATCH /api/admin/reservations/[id].
export default async function AdminReservationsPage({ searchParams }: PageProps<"/admin/rezervacije">) {
  await requireAdminPage();
  const query = await searchParams;
  const filter = parseStatusFilter(query.status);
  const today = todayInBelgrade();
  const { upcoming, past } = await getReservationsForAdmin(filter, today);

  return (
    <section aria-labelledby="reservations-title">
      <h1 id="reservations-title" className="font-serif text-3xl font-semibold text-ink-900">
        {t.title}
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{t.intro}</p>

      <ReservationFilters current={filter} />

      <ReservationNoticeProvider>
        <section aria-labelledby="upcoming-title" className="mt-6">
          <h2 id="upcoming-title" className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
            {t.upcoming}
          </h2>
          {upcoming.length > 0 ? (
            <ReservationList reservations={upcoming} today={today} />
          ) : (
            <div className="mt-3 rounded-xl bg-cream-50 p-5 text-ink-900 ring-1 ring-sand-200">
              <p>{t.noUpcoming}</p>
              {filter !== "all" ? (
                <Link
                  href="/admin/rezervacije?status=all"
                  className="mt-1 inline-flex min-h-11 items-center font-semibold text-brand-800 underline underline-offset-2"
                >
                  {t.showAll}
                </Link>
              ) : null}
            </div>
          )}
        </section>

        {past.length > 0 ? (
          <section aria-labelledby="past-title" className="mt-10">
            <h2 id="past-title" className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
              {t.past}
            </h2>
            <ReservationList reservations={past} today={today} />
            {past.length === PAST_LIMIT ? (
              <p className="mt-3 text-sm text-ink-600">{fill(t.pastLimit, { n: PAST_LIMIT })}</p>
            ) : null}
          </section>
        ) : null}
      </ReservationNoticeProvider>
    </section>
  );
}
