import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingCard } from "@/components/booking/BookingCard";
import { StickyBookingBar } from "@/components/booking/StickyBookingBar";
import { ApartmentCard } from "@/components/home/ApartmentCard";
import { Gallery } from "@/components/home/Gallery";
import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getApartmentBySlug, getApartments } from "@/lib/apartments";
import { getBlockedNights } from "@/lib/availability";
import { rangeFromQuery } from "@/lib/calendar-selection";
import { whatsappHref } from "@/lib/content";
import { addDays, todayInBelgrade } from "@/lib/dates";
import { getDictionary } from "@/lib/dictionaries";
import { fill, formatPrice } from "@/lib/format";
import { apartmentPath, hasLocale, locales, localizedPath } from "@/lib/i18n";
import { lowestBasePrice } from "@/lib/pricing";

export async function generateStaticParams() {
  const apartments = await getApartments();
  return apartments.map((apartment) => ({ slug: apartment.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/apartmani/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const apartment = await getApartmentBySlug(slug);
  if (!apartment) return {};
  const dict = getDictionary(lang);
  const title = fill(dict.meta.apartmentTitle, { name: apartment.name });
  return {
    title: { absolute: title },
    description: apartment.summary[lang],
    alternates: {
      canonical: apartmentPath(lang, slug),
      languages: Object.fromEntries(locales.map((l) => [l, apartmentPath(l, slug)])),
    },
    openGraph: { title, description: apartment.summary[lang], url: apartmentPath(lang, slug) },
  };
}

export default async function ApartmentPage({ params, searchParams }: PageProps<"/[lang]/apartmani/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const apartment = await getApartmentBySlug(slug);
  if (!apartment) notFound();

  const dict = getDictionary(lang);
  const t = dict.apartment;
  const query = await searchParams;
  const today = todayInBelgrade();
  // Availability window: today + 12 months. Only the dates of booked nights reach the browser.
  const until = addDays(today, 365);
  // null = Booking calendar unavailable (already logged, without the URL, in lib/booking-ical.ts)
  const blocked = await getBlockedNights(apartment.slug, today, until).catch(() => null);
  const range = blocked
    ? rangeFromQuery(query.checkIn, query.checkOut, { today, until, blocked: new Set(blocked) })
    : { checkIn: null, checkOut: null };
  const fromPrice = lowestBasePrice(apartment);
  const priceLabel = `${dict.booking.from} ${formatPrice(fromPrice, lang)} ${dict.booking.perNight}`;
  const others = (await getApartments()).filter((a) => a.slug !== apartment.slug).slice(0, 3);

  const facts: { icon: IconName; title: string; body: string }[] = [
    { icon: "clock", title: t.checkInOut, body: t.checkInOutSoon }, // TODO(vlasnik)
    { icon: "rules", title: t.houseRules, body: t.houseRulesSoon }, // TODO(vlasnik)
  ];

  return (
    <div className="bg-cream-50 pb-28 pt-24 md:pt-32 lg:pb-24">
      <Container>
        <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
          <ol className="flex items-center gap-2">
            <li>
              <Link href={localizedPath(lang)} className="inline-flex min-h-11 items-center hover:text-ink-900">
                {t.backHome}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink-900">
              {apartment.name}
            </li>
          </ol>
        </nav>

        <header className="mt-2">
          <h1 className="font-serif text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-tight text-ink-900">
            {apartment.name}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-ink-600">
            <Icon name="users" className="size-5" strokeWidth={1.5} />
            {fill(t.upTo, { n: apartment.maxGuests })}
            <span aria-hidden="true">·</span>
            <Icon name="pin" className="size-5" strokeWidth={1.5} />
            {dict.hero.eyebrow}
          </p>
        </header>

        <div className="mt-8">
          <Gallery
            images={apartment.images.map((image) => ({ src: image.src, alt: image.alt[lang] }))}
            labels={dict.gallery}
          />
        </div>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
          <div>
            <section aria-labelledby="about-title">
              <h2 id="about-title" className="font-serif text-3xl font-semibold text-ink-900">
                {t.about}
              </h2>
              <span aria-hidden="true" className="mt-3 block h-px w-16 bg-gold-500" />
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">{apartment.description[lang]}</p>
            </section>

            <section aria-labelledby="amenities-title" className="mt-12 border-t border-sand-200 pt-10">
              <h2 id="amenities-title" className="font-serif text-2xl font-semibold text-ink-900">
                {t.amenities}
              </h2>
              {/* TODO(vlasnik): prava lista sadržaja (Wi-Fi, klima, TV, kuhinja...) */}
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                <li className="flex items-center gap-3 text-ink-900">
                  <Icon name="jacuzzi" className="size-7 text-gold-600" />
                  {t.amenityJacuzzi}
                </li>
              </ul>
              <p className="mt-4 text-sm text-ink-600">{t.amenitiesSoon}</p>
            </section>

            <div className="mt-12 grid gap-8 border-t border-sand-200 pt-10 sm:grid-cols-2">
              {facts.map((fact) => (
                <section key={fact.title} aria-label={fact.title} className="flex gap-4">
                  <Icon name={fact.icon} className="size-7 shrink-0 text-gold-600" />
                  <div>
                    <h2 className="font-serif text-xl font-semibold text-ink-900">{fact.title}</h2>
                    <p className="mt-1 text-sm text-ink-600">{fact.body}</p>
                  </div>
                </section>
              ))}
            </div>
          </div>

          <aside id="rezervacija" aria-label={dict.booking.title} className="scroll-mt-24">
            <div className="lg:sticky lg:top-28">
              <BookingCard
                key={`${range.checkIn}-${range.checkOut}`}
                lang={lang}
                labels={dict.booking}
                whatsappLabel={dict.contact.whatsappLabel}
                whatsappHref={whatsappHref(`${dict.contact.whatsappMessage} (${apartment.name})`)}
                prices={{
                  priceWeekday: apartment.priceWeekday,
                  priceFriday: apartment.priceFriday,
                  priceSaturday: apartment.priceSaturday,
                }}
                fromPrice={fromPrice}
                today={today}
                until={until}
                blocked={blocked}
                initialCheckIn={range.checkIn}
                initialCheckOut={range.checkOut}
              />
            </div>
          </aside>
        </div>

        {others.length > 0 ? (
          <section aria-labelledby="others-title" className="mt-20 border-t border-sand-200 pt-16 md:mt-28">
            <h2 id="others-title" className="font-serif text-3xl font-semibold text-ink-900">
              {t.otherApartments}
            </h2>
            <span aria-hidden="true" className="mt-3 block h-px w-16 bg-gold-500" />
            <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {others.map((other) => (
                <li key={other.slug}>
                  <ApartmentCard apartment={other} lang={lang} dict={dict} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>

      <StickyBookingBar priceLabel={priceLabel} cta={dict.booking.chooseDates} targetId="rezervacija" />
    </div>
  );
}
