import type { Metadata } from "next";
import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { requireAdminPage } from "@/lib/admin-auth";
import { loadedWindow, parseYearMonth, yearMonthOf } from "@/lib/admin-calendar";
import { adminText } from "@/lib/admin-text";
import { getApartments, getPriceOverrides } from "@/lib/apartments";
import { getAdminNightStatuses } from "@/lib/availability";
import { todayInBelgrade } from "@/lib/dates";

const t = adminText.calendar;

export const metadata: Metadata = { title: adminText.nav.calendar };

// ?apartment=<slug>&month=YYYY-MM. Anything missing or unknown falls back to
// the first apartment and the current month in Belgrade.
export default async function AdminCalendarPage({ searchParams }: PageProps<"/admin/kalendar">) {
  await requireAdminPage();
  const query = await searchParams;

  const apartments = await getApartments();
  const apartment = apartments.find((item) => item.slug === query.apartment) ?? apartments.at(0);

  const today = todayInBelgrade();
  const shown = parseYearMonth(query.month) ?? yearMonthOf(today);
  const loaded = loadedWindow(shown);

  if (!apartment) {
    return (
      <section aria-labelledby="calendar-title">
        <CalendarHeading />
        <p className="mt-6 rounded-xl bg-cream-50 p-5 text-ink-900 ring-1 ring-sand-200">{adminText.noApartments}</p>
      </section>
    );
  }

  // Prices and who holds each night, for the same three months.
  const [overrides, nights] = await Promise.all([
    getPriceOverrides(apartment.id, loaded.from, loaded.until),
    getAdminNightStatuses(apartment.slug, apartment.id, loaded),
  ]);

  return (
    <section aria-labelledby="calendar-title">
      <CalendarHeading />
      <AdminCalendar
        key={apartment.slug}
        apartments={apartments.map(({ slug, name }) => ({ slug, name }))}
        apartment={{
          slug: apartment.slug,
          name: apartment.name,
          prices: {
            priceWeekday: apartment.priceWeekday,
            priceFriday: apartment.priceFriday,
            priceSaturday: apartment.priceSaturday,
          },
        }}
        overrides={overrides}
        statuses={nights.statuses}
        bookingUnavailable={nights.bookingUnavailable}
        loaded={loaded}
        shown={shown}
        today={today}
      />
    </section>
  );
}

function CalendarHeading() {
  return (
    <>
      <h1 id="calendar-title" className="font-serif text-3xl font-semibold text-ink-900">
        {t.title}
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{t.intro}</p>
    </>
  );
}
