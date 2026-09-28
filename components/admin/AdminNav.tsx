"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminText } from "@/lib/admin-text";

const links = [
  { href: "/admin/kalendar", label: adminText.nav.calendar },
  { href: "/admin/podesavanja", label: adminText.nav.settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label={adminText.nav.label}>
      <ul className="flex gap-1">
        {links.map((link) => {
          const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${
                  current ? "bg-cream-50 text-brand-900" : "text-cream-50 hover:bg-brand-700"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
