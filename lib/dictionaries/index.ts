import type { Locale } from "../i18n";
import { en } from "./en";
import { sr, type Dictionary } from "./sr";

// Server-side only in practice: client components receive the strings they need as props
// and import just the Dictionary type from here.

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { sr, en };

export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang];
}
