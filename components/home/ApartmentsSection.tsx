import type { Apartment } from "@/lib/apartments";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ApartmentCard } from "./ApartmentCard";

type ApartmentsSectionProps = {
  apartments: Apartment[];
  lang: Locale;
  dict: Dictionary;
};

export function ApartmentsSection({ apartments, lang, dict }: ApartmentsSectionProps) {
  const single = apartments.length === 1;

  return (
    <section id="apartmani" aria-labelledby="apartmani-title" className="bg-cream-50 py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeading id="apartmani-title" eyebrow={dict.apartments.eyebrow} title={dict.apartments.title} />
        </Reveal>

        <ul
          className={`mt-12 grid gap-6 md:mt-16 lg:gap-8 ${
            single ? "" : "md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {apartments.map((apartment, i) => (
            <li key={apartment.slug}>
              <Reveal delay={(i % 3) * 100} className="h-full">
                <ApartmentCard apartment={apartment} lang={lang} dict={dict} wide={single} />
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
