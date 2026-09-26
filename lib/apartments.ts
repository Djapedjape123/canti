import type { Locale } from "./i18n";
import type { BasePrices } from "./pricing";

// TEMPORARY data source until Supabase is connected.
// Later only getApartments() / getApartmentBySlug() switch to the database;
// components only depend on the Apartment type.

export type Apartment = BasePrices & {
  slug: string;
  name: string;
  maxGuests: number;
  summary: Record<Locale, string>;
  description: Record<Locale, string>;
  images: { src?: string; alt: Record<Locale, string> }[];
};

const placeholderImages = (name: string): Apartment["images"] =>
  Array.from({ length: 5 }, (_, i) => ({
    alt: {
      sr: `${name}, fotografija ${i + 1}`,
      en: `${name}, photo ${i + 1}`,
    },
  }));

const comingSoon: Record<Locale, string> = {
  sr: "Opis apartmana uskoro.",
  en: "Apartment description coming soon.",
};

const apartments: Apartment[] = [
  {
    slug: "de-lux",
    name: "De Lux",
    priceWeekday: 65,
    priceFriday: 75,
    priceSaturday: 79,
    maxGuests: 2, // TODO(vlasnik): potvrditi maksimalan broj gostiju
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
  // TODO(vlasnik): prava imena, cene i opisi ostala 4 apartmana
  ...[2, 3, 4, 5].map(
    (n): Apartment => ({
      slug: `apartman-${n}`,
      name: `Apartman ${n}`,
      priceWeekday: 65,
      priceFriday: 75,
      priceSaturday: 79,
      maxGuests: 2,
      summary: comingSoon,
      description: comingSoon,
      images: placeholderImages(`Apartman ${n}`),
    }),
  ),
];

export async function getApartments(): Promise<Apartment[]> {
  return apartments;
}

export async function getApartmentBySlug(slug: string): Promise<Apartment | null> {
  return apartments.find((apartment) => apartment.slug === slug) ?? null;
}
