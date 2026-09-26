import type { Dictionary } from "@/lib/dictionaries";
import { faqPageJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Native <details>/<summary>: accessible and works without JavaScript. */
export function Faq({ dict }: { dict: Dictionary }) {
  const t = dict.faq;
  const jsonLd = faqPageJsonLd(t.items);

  return (
    <section id="pitanja" aria-labelledby="pitanja-title" className="bg-cream-50 py-20 md:py-28">
      <Container className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <Reveal>
          <SectionHeading id="pitanja-title" eyebrow={t.eyebrow} title={t.title} />
        </Reveal>

        <Reveal delay={100}>
          <div className="divide-y divide-sand-200 border-y border-sand-200">
            {t.items.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 font-serif text-xl font-semibold text-ink-900 transition-colors hover:text-brand-700">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="relative size-5 shrink-0 text-gold-600 before:absolute before:left-0 before:top-1/2 before:h-px before:w-5 before:bg-current after:absolute after:left-1/2 after:top-0 after:h-5 after:w-px after:bg-current after:transition-transform after:duration-300 group-open:after:scale-y-0"
                  />
                </summary>
                <p className="pb-6 pr-10 leading-relaxed text-ink-600">{item.a ?? t.soon}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </Container>

      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      ) : null}
    </section>
  );
}
