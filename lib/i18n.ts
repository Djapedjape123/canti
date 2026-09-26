export const locales = ["sr", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "sr";

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Value for <html lang>. Serbian is written in Latin script on this site. */
export const htmlLang: Record<Locale, string> = {
  sr: "sr-Latn",
  en: "en",
};

/** Locale used by Intl (prices, dates). */
export const intlLocale: Record<Locale, string> = {
  sr: "sr-RS",
  en: "en-GB",
};

export const localeLabels: Record<Locale, { short: string; long: string }> = {
  sr: { short: "SR", long: "Srpski" },
  en: { short: "EN", long: "English" },
};

/** "/de-lux" + "sr" → "/sr/de-lux". Path must start with "/" or be empty. */
export function localizedPath(lang: Locale, path = ""): string {
  return `/${lang}${path}`;
}

/** "/sr/apartmani/de-lux" → "/en/apartmani/de-lux" */
export function switchLocaleInPath(pathname: string, target: Locale): string {
  const segments = pathname.split("/");
  if (segments.length > 1 && hasLocale(segments[1])) {
    segments[1] = target;
    return segments.join("/");
  }
  return localizedPath(target, pathname === "/" ? "" : pathname);
}

export function apartmentPath(lang: Locale, slug: string): string {
  return localizedPath(lang, `/apartmani/${slug}`);
}
