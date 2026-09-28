import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { adminText } from "@/lib/admin-text";

// Header of every admin page after login: petrol bar, brand, navigation, logout.
// Simple on purpose (no animations, big touch targets): the owner mostly uses a phone.
// Each page checks the login itself with requireAdminPage().
export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="bg-brand-800 text-cream-50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 md:px-6">
          <p className="font-serif text-2xl font-semibold tracking-wide text-gold-500">
            ĆANTI
            <span className="ml-2 align-middle font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-cream-50/70">
              {adminText.nav.brandLabel}
            </span>
          </p>
          <div className="ml-auto md:order-3">
            <LogoutButton />
          </div>
          <div className="w-full md:order-2 md:w-auto">
            <AdminNav />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </>
  );
}
