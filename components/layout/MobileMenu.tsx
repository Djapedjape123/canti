"use client";

import Link from "next/link";
import { useRef } from "react";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import type { NavApartment } from "./NavApartmentsDropdown";
import type { NavLink } from "./Header";

type MobileMenuProps = {
  lang: Locale;
  labels: Dictionary["nav"];
  tagline: string;
  homeHref: string;
  bookHref: string;
  apartments: NavApartment[];
  links: NavLink[];
};

/** Full-screen menu on a native <dialog>: focus trap + Esc come from the browser. */
export function MobileMenu({ lang, labels, tagline, homeHref, bookHref, apartments, links }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={labels.openMenu}
        aria-haspopup="dialog"
        className="grid size-11 place-items-center rounded-full text-cream-50 transition-colors hover:text-gold-500 lg:hidden"
      >
        <Icon name="menu" className="size-7" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label={labels.mainNav}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-brand-900 p-0 text-cream-50"
      >
        <div className="flex min-h-full flex-col px-5 pb-10 pt-3">
          <div className="flex h-16 items-center justify-between">
            <Logo href={homeHref} tagline={tagline} onClick={close} />
            <button
              type="button"
              onClick={close}
              aria-label={labels.closeMenu}
              className="grid size-11 place-items-center rounded-full transition-colors hover:text-gold-500"
            >
              <Icon name="close" className="size-7" />
            </button>
          </div>

          <nav aria-label={labels.mainNav} className="mt-10 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
              {labels.apartments}
            </p>
            <span aria-hidden="true" className="mt-3 block h-px w-16 bg-gold-500" />
            <ul className="mt-4 grid gap-1">
              {apartments.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex min-h-11 items-baseline justify-between gap-4 py-1 font-serif text-2xl font-semibold transition-colors hover:text-gold-500"
                  >
                    {item.name}
                    <span className="font-sans text-xs font-normal text-cream-50/60">{item.meta}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="mt-10 grid gap-2 border-t border-cream-50/10 pt-8">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="flex min-h-11 items-center font-serif text-3xl font-semibold transition-colors hover:text-gold-500"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-10 flex items-center justify-between gap-4">
            <LanguageSwitcher lang={lang} label={labels.language} size="lg" onNavigate={close} />
            <ButtonLink href={bookHref} variant="gold">
              {labels.book}
            </ButtonLink>
          </div>
        </div>
      </dialog>
    </>
  );
}
