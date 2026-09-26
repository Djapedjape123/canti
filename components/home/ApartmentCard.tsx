import Link from "next/link";
import type { Apartment } from "@/lib/apartments";
import type { Dictionary } from "@/lib/dictionaries";
import { fill, formatPrice } from "@/lib/format";
import { apartmentPath, type Locale } from "@/lib/i18n";
import { lowestBasePrice } from "@/lib/pricing";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";

type ApartmentCardProps = {
  apartment: Apartment;
  lang: Locale;
  dict: Dictionary;
  /** Horizontal layout, used when there is only one apartment. */
  wide?: boolean;
};

export function ApartmentCard({ apartment, lang, dict, wide = false }: ApartmentCardProps) {
  const t = dict.apartments;
  const href = apartmentPath(lang, apartment.slug);
  const cover = apartment.images[0];

  return (
    <article
      className={`group relative flex h-full overflow-hidden rounded-xl bg-cream-50 shadow-sm ring-1 ring-sand-200 transition-shadow duration-300 hover:shadow-lg ${
        wide ? "flex-col md:flex-row" : "flex-col"
      }`}
    >
      <div className={`relative aspect-4/3 overflow-hidden ${wide ? "md:aspect-auto md:w-3/5" : ""}`}>
        <Photo
          src={cover?.src}
          alt={cover?.alt[lang] ?? apartment.name}
          sizes={wide ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"}
          className="transition-transform duration-700 ease-out group-hover:scale-105"
          placeholderLabel={dict.gallery.placeholder}
        />
      </div>

      <div className={`flex flex-1 flex-col p-6 ${wide ? "md:justify-center md:p-10 lg:p-14" : ""}`}>
        <h3 className={`font-serif font-semibold text-ink-900 ${wide ? "text-3xl md:text-4xl" : "text-2xl"}`}>
          {/* Stretched link: the whole card is clickable, but there is only one link for screen readers. */}
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {apartment.name}
          </Link>
        </h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-ink-600">
          <Icon name="users" className="size-4" strokeWidth={1.5} />
          {fill(t.upTo, { n: apartment.maxGuests })}
        </p>
        <p className="mt-4 leading-relaxed text-ink-600">{apartment.summary[lang]}</p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
          <p className="text-ink-600">
            {t.from}{" "}
            <span className="font-serif text-2xl font-semibold text-ink-900">
              {formatPrice(lowestBasePrice(apartment), lang)}
            </span>{" "}
            {t.perNight}
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800">
            {t.cta}
            <Icon
              name="arrowRight"
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
              strokeWidth={1.75}
            />
          </span>
        </div>
      </div>
    </article>
  );
}
