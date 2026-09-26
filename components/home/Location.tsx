import type { Dictionary } from "@/lib/dictionaries";
import { googleMapsHref, siteContent } from "@/lib/content";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Location({ dict }: { dict: Dictionary }) {
  const t = dict.location;
  const address = siteContent.address;

  return (
    <section id="lokacija" aria-labelledby="lokacija-title" className="bg-cream-100 py-20 md:py-28">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal>
          <SectionHeading id="lokacija-title" eyebrow={t.eyebrow} title={t.title} intro={<p>{t.text}</p>} />

          <h3 className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
            {t.nearbyTitle}
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {t.nearby.map((place) => (
              <li key={place} className="flex items-center gap-3 text-ink-900">
                <Icon name="pin" className="size-5 shrink-0 text-gold-600" strokeWidth={1.5} />
                {place}
              </li>
            ))}
          </ul>

          <ButtonLink href={googleMapsHref()} variant="outline-dark" className="mt-10">
            <Icon name="pin" className="size-4" strokeWidth={1.75} />
            {t.openMaps}
          </ButtonLink>
        </Reveal>

        <Reveal delay={100}>
          <div className="relative aspect-4/3 overflow-hidden rounded-xl shadow-sm ring-1 ring-sand-200 lg:aspect-square">
            {address ? (
              <iframe
                title={t.mapTitle}
                src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 size-full border-0"
              />
            ) : (
              // TODO(vlasnik): tačna adresa → mapa se prikazuje automatski
              <div className="photo-placeholder absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-cream-50/80">
                <Icon name="pin" className="size-10 text-gold-500" />
                <p className="text-sm">{t.mapSoon}</p>
              </div>
            )}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
