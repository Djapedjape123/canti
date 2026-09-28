import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-auth";
import { adminText } from "@/lib/admin-text";

export const metadata: Metadata = { title: adminText.nav.settings };

// Placeholder until the base price form is built; the login check is already real.
export default async function AdminSettingsPage() {
  await requireAdminPage();

  return (
    <section aria-labelledby="settings-title">
      <h1 id="settings-title" className="font-serif text-3xl font-semibold text-ink-900">
        {adminText.nav.settings}
      </h1>
      <p className="mt-2 text-ink-600">{adminText.comingSoon.settings}</p>
    </section>
  );
}
