import "server-only";
import { cache } from "react";
import type { Locale } from "./i18n";
import type { BasePrices } from "./pricing";
import { getSupabaseAdmin } from "./supabase/admin";
import type { ApartmentRow } from "./supabase/types";

// Name, prices and guest count come from the database (table `apartments`):
// a new apartment is a new row there, no code changes.
// Texts and photos still live here, per slug, until the owner sends them.
// An apartment without an entry below gets generic placeholder content.

export type Apartment = BasePrices & {
  id: string;
  slug: string;
  name: string;
  maxGuests: number;
  summary: Record<Locale, string>;
  description: Record<Locale, string>;
  images: { src?: string; alt: Record<Locale, string> }[];
};

type ApartmentContent = Pick<Apartment, "summary" | "description" | "images">;

const apartmentContent: Record<string, ApartmentContent> = {
  "de-lux": {
    summary: {
      sr: "Apartman sa privatnim đakuzijem, za romantične vikende i posebne prilike.",
      en: "An apartment with a private jacuzzi, made for romantic weekends and special occasions.",
    },
    description: {
      // TODO(vlasnik): pravi opis apartmana (kvadratura, raspored, sadržaji)
      sr: "De Lux je apartman sa privatnim đakuzijem na Podbari u Novom Sadu. Idealan za romantičan vikend, proslavu godišnjice ili trenutke samo za vas dvoje.",
      en: "De Lux is an apartment with a private jacuzzi in Podbara, Novi Sad. Ideal for a romantic weekend, an anniversary or a few quiet days just for the two of you.",
    },
    images: [
      {
        alt: {
          sr: "Đakuzi u apartmanu De Lux uveče",
          en: "The jacuzzi in the De Lux apartment in the evening",
        },
      },
      {
        alt: { sr: "Spavaća soba apartmana De Lux", en: "De Lux apartment bedroom" },
      },
      {
        alt: { sr: "Dnevni boravak apartmana De Lux", en: "De Lux apartment living area" },
      },
      {
        alt: { sr: "Detalj enterijera apartmana De Lux", en: "De Lux apartment interior detail" },
      },
      {
        alt: { sr: "Kupatilo apartmana De Lux", en: "De Lux apartment bathroom" },
      },
    ],
  },
};

const comingSoon: Record<Locale, string> = {
  sr: "Opis apartmana uskoro.",
  en: "Apartment description coming soon.",
};

function placeholderContent(name: string): ApartmentContent {
  return {
    summary: comingSoon,
    description: comingSoon,
    images: Array.from({ length: 5 }, (_, i) => ({
      alt: { sr: `${name}, fotografija ${i + 1}`, en: `${name}, photo ${i + 1}` },
    })),
  };
}

function contentFor(slug: string, name: string): ApartmentContent {
  // Object.hasOwn: a slug like "constructor" must not match Object.prototype.
  return Object.hasOwn(apartmentContent, slug) ? apartmentContent[slug] : placeholderContent(name);
}

// Public columns only. booking_ical_url is a secret and is never selected here,
// because Apartment objects are passed on to components.
const PUBLIC_COLUMNS = "id, slug, name, price_weekday, price_friday, price_saturday, max_guests";

type PublicApartmentRow = Pick<
  ApartmentRow,
  "id" | "slug" | "name" | "price_weekday" | "price_friday" | "price_saturday" | "max_guests"
>;

function toApartment(row: PublicApartmentRow): Apartment {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceWeekday: row.price_weekday,
    priceFriday: row.price_friday,
    priceSaturday: row.price_saturday,
    maxGuests: row.max_guests,
    ...contentFor(row.slug, row.name),
  };
}

/**
 * All apartments in the owner's order (sort_order, then name).
 * cache(): the layout, the page and generateMetadata share one query per request.
 */
export const getApartments = cache(async (): Promise<Apartment[]> => {
  const { data, error } = await getSupabaseAdmin()
    .from("apartments")
    .select(PUBLIC_COLUMNS)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`Loading apartments failed: ${error.message}`);
  return data.map(toApartment);
});

export async function getApartmentBySlug(slug: string): Promise<Apartment | null> {
  const apartments = await getApartments();
  return apartments.find((apartment) => apartment.slug === slug) ?? null;
}

/**
 * Price overrides for the nights in [from, to) as { 'YYYY-MM-DD': price }.
 * `to` is exclusive, like check_out. A night without an entry uses the base price.
 */
export async function getPriceOverrides(
  apartmentId: string,
  from: string,
  to: string,
): Promise<Record<string, number>> {
  const { data, error } = await getSupabaseAdmin()
    .from("price_overrides")
    .select("date, price")
    .eq("apartment_id", apartmentId)
    .gte("date", from)
    .lt("date", to);
  if (error) throw new Error(`Loading price overrides failed: ${error.message}`);
  return Object.fromEntries(data.map((row) => [row.date, row.price]));
}
