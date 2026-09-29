"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminText } from "@/lib/admin-text";
import { fill } from "@/lib/format";

const links = [
  { href: "/admin/kalendar", label: adminText.nav.calendar },
  { href: "/admin/rezervacije", label: adminText.nav.reservations },
  { href: "/admin/podesavanja", label: adminText.nav.settings },
];

type AdminNavProps = {
  /** Requests waiting for the owner; null when the count could not be loaded. */
  pendingCount: number | null;
};

export function AdminNav({ pendingCount }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={adminText.nav.label}>
      <ul className="flex gap-1">
        {links.map((link) => {
          const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const badge = link.href === "/admin/rezervacije" && pendingCount ? pendingCount : null;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold sm:px-4 ${
                  current ? "bg-cream-50 text-brand-900" : "text-cream-50 hover:bg-brand-700"
                }`}
              >
                {link.label}
                {badge ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="grid min-w-5 place-items-center rounded-full bg-gold-500 px-1.5 text-xs leading-5 text-brand-900"
                    >
                      {badge}
                    </span>
                    <span className="sr-only">, {fill(adminText.nav.pendingCount, { n: badge })}</span>
                  </>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
