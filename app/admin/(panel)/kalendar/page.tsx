import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-auth";
import { adminText } from "@/lib/admin-text";

export const metadata: Metadata = { title: adminText.nav.calendar };

// Placeholder until the price calendar is built; the login check is already real.
export default async function AdminCalendarPage() {
  await requireAdminPage();

  return (
    <section aria-labelledby="calendar-title">
      <h1 id="calendar-title" className="font-serif text-3xl font-semibold text-ink-900">
        {adminText.nav.calendar}
      </h1>
      <p className="mt-2 text-ink-600">{adminText.comingSoon.calendar}</p>
    </section>
  );
}
