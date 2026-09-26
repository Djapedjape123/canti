"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/dictionaries";
import { localizedPath, type Locale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavApartmentsDropdown, type NavApartment } from "./NavApartmentsDropdown";

export type NavLink = { href: string; label: string };

type HeaderProps = {
  lang: Locale;
  labels: Dictionary["nav"];
  tagline: string;
  apartments: NavApartment[];
  bookHref: string;
  showReviews: boolean;
};

const SCROLL_THRESHOLD = 24;

/**
 * Transparent over the home hero, solid petrol after scrolling.
 * On every other page it is solid from the start.
 */
export function Header({ lang, labels, tagline, apartments, bookHref, showReviews }: HeaderProps) {
  const pathname = usePathname();
  const homeHref = localizedPath(lang);
  const isHome = pathname === homeHref;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !isHome || scrolled;

  const links: NavLink[] = [
    { href: `${homeHref}#lokacija`, label: labels.location },
    ...(showReviews ? [{ href: `${homeHref}#utisci`, label: labels.reviews }] : []),
    { href: `${homeHref}#pitanja`, label: labels.faq },
    { href: "#kontakt", label: labels.contact },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-300 ${
        solid ? "bg-brand-800/95 shadow-sm backdrop-blur" : "bg-transparent"
      }`}
    >
      <Container className="flex h-16 items-center justify-between gap-6 md:h-20">
        <Logo href={homeHref} tagline={tagline} />

        <nav aria-label={labels.mainNav} className="hidden items-center gap-8 lg:flex">
          <NavApartmentsDropdown label={labels.apartments} items={apartments} />
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center text-sm font-medium text-cream-50/90 transition-colors hover:text-gold-500"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <LanguageSwitcher lang={lang} label={labels.language} />
          <ButtonLink href={bookHref} variant="gold" className="hidden px-5 sm:inline-flex">
            {labels.book}
          </ButtonLink>
          <MobileMenu
            lang={lang}
            labels={labels}
            tagline={tagline}
            homeHref={homeHref}
            bookHref={bookHref}
            apartments={apartments}
            links={links}
          />
        </div>
      </Container>
    </header>
  );
}
