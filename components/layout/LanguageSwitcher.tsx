"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeLabels, locales, switchLocaleInPath, type Locale } from "@/lib/i18n";

type LanguageSwitcherProps = {
  lang: Locale;
  label: string;
  size?: "sm" | "lg";
  onNavigate?: () => void;
};

/** SR | EN — keeps the visitor on the same page, only the language prefix changes. */
export function LanguageSwitcher({ lang, label, size = "sm", onNavigate }: LanguageSwitcherProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="flex items-center">
      {locales.map((locale, i) => {
        const active = locale === lang;
        return (
          <span key={locale} className="flex items-center">
            {i > 0 ? (
              <span aria-hidden="true" className="mx-1 text-cream-50/30">
                |
              </span>
            ) : null}
            <Link
              href={switchLocaleInPath(pathname, locale)}
              hrefLang={locale}
              lang={locale}
              aria-current={active ? "true" : undefined}
              aria-label={localeLabels[locale].long}
              onClick={onNavigate}
              className={`inline-grid min-h-11 min-w-11 place-items-center rounded-full font-semibold tracking-[0.15em] transition-colors ${
                size === "lg" ? "text-base" : "text-xs"
              } ${active ? "text-gold-500" : "text-cream-50/70 hover:text-cream-50"}`}
            >
              {localeLabels[locale].short}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
