import { intlLocale, type Locale } from "./i18n";
import { parseIsoDate } from "./dates";

export function formatPrice(amount: number, lang: Locale): string {
  return new Intl.NumberFormat(intlLocale[lang], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** '2026-10-02' → "2. okt 2026." / "2 Oct 2026" (formatted in UTC so the day never shifts). */
export function formatDateShort(value: string, lang: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[lang], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseIsoDate(value));
}

/** '2026-10-02' → "pet" / "Fri" */
export function formatWeekdayShort(value: string, lang: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[lang], { weekday: "short", timeZone: "UTC" }).format(
    parseIsoDate(value),
  );
}

/** '2026-10-02' → "petak, 2. oktobar 2026." — for screen readers */
export function formatDateLong(value: string, lang: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[lang], { dateStyle: "full", timeZone: "UTC" }).format(
    parseIsoDate(value),
  );
}

export function formatMonthYear(year: number, month: number, lang: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[lang], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Replaces {name} placeholders: fill("od {price}", { price: "65 €" }) */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
