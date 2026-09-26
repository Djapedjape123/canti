import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/home/Hero";
import { Highlights } from "@/components/home/Highlights";
import { ApartmentsSection } from "@/components/home/ApartmentsSection";
import { Occasions } from "@/components/home/Occasions";
import { GallerySection } from "@/components/home/GallerySection";
import { Location } from "@/components/home/Location";
import { Reviews } from "@/components/home/Reviews";
import { Faq } from "@/components/home/Faq";
import { FinalCta } from "@/components/home/FinalCta";
import { getApartments } from "@/lib/apartments";
import { getDictionary } from "@/lib/dictionaries";
import { plural } from "@/lib/plural";
import { formatPrice } from "@/lib/format";
import { apartmentPath, hasLocale, locales, localizedPath } from "@/lib/i18n";
import { lowestBasePrice } from "@/lib/pricing";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: { absolute: dict.meta.title },
    description: dict.meta.description,
    alternates: {
      canonical: localizedPath(lang),
      languages: Object.fromEntries(locales.map((l) => [l, localizedPath(l)])),
    },
    openGraph: { title: dict.meta.title, description: dict.meta.description, url: localizedPath(lang) },
  };
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const apartments = await getApartments();
  const featured = apartments[0];
  if (!featured) notFound();

  const fromPrice = formatPrice(Math.min(...apartments.map(lowestBasePrice)), lang);
  const featuredPath = apartmentPath(lang, featured.slug);
  const guestOptions = Array.from({ length: featured.maxGuests }, (_, i) => ({
    value: i + 1,
    label: plural(lang, i + 1, {
      one: dict.search.guestOne,
      few: dict.search.guestFew,
      many: dict.search.guestMany,
    }),
  }));

  return (
    <>
      <Hero
        dict={dict}
        image={featured.images[0]?.src}
        fromPrice={fromPrice}
        guestOptions={guestOptions}
        searchTarget={featuredPath}
      />
      <Highlights dict={dict} />
      <ApartmentsSection apartments={apartments} lang={lang} dict={dict} />
      <Occasions dict={dict} />
      <GallerySection apartment={featured} lang={lang} dict={dict} />
      <Location dict={dict} />
      <Reviews dict={dict} />
      <Faq dict={dict} />
      <FinalCta dict={dict} bookHref={`${featuredPath}#rezervacija`} image={featured.images[1]?.src} />
    </>
  );
}
