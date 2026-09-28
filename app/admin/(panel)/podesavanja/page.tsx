import type { Metadata } from "next";
import { BasePricesForm } from "@/components/admin/BasePricesForm";
import { requireAdminPage } from "@/lib/admin-auth";
import { adminText } from "@/lib/admin-text";
import { getApartments } from "@/lib/apartments";

const t = adminText.settings;

export const metadata: Metadata = { title: adminText.nav.settings };

// Base prices per apartment: weekday (Sunday–Thursday nights), Friday night, Saturday night.
export default async function AdminSettingsPage() {
  await requireAdminPage();
  const apartments = await getApartments();

  return (
    <section aria-labelledby="settings-title">
      <h1 id="settings-title" className="font-serif text-3xl font-semibold text-ink-900">
        {t.title}
      </h1>
      <p className="mt-1 text-sm leading-relaxed text-ink-600">{t.intro}</p>

      {apartments.length > 0 ? (
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {apartments.map((apartment) => (
            <li key={apartment.slug}>
              <BasePricesForm
                slug={apartment.slug}
                name={apartment.name}
                prices={{
                  priceWeekday: apartment.priceWeekday,
                  priceFriday: apartment.priceFriday,
                  priceSaturday: apartment.priceSaturday,
                }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl bg-cream-50 p-5 text-ink-900 ring-1 ring-sand-200">{adminText.noApartments}</p>
      )}
    </section>
  );
}
