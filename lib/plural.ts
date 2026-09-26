import type { Locale } from "./i18n";

export type PluralForms = { one: string; few: string; many: string };

/**
 * Serbian has three plural forms (1 gost, 2 gosta, 5 gostiju), English two.
 * Returns the right template with {n} already filled in.
 */
export function plural(lang: Locale, n: number, forms: PluralForms): string {
  const category = new Intl.PluralRules(lang === "sr" ? "sr-Latn" : "en").select(n);
  const template = category === "one" ? forms.one : category === "few" ? forms.few : forms.many;
  return template.replace("{n}", String(n));
}
