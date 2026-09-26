import type { Dictionary } from "@/lib/dictionaries";
import { siteContent } from "@/lib/content";
import { fill } from "@/lib/format";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Only real, owner-approved reviews. Renders nothing while there are none. */
export function Reviews({ dict }: { dict: Dictionary }) {
  const reviews = siteContent.reviews;
  if (reviews.length === 0) return null;

  const t = dict.reviews;

  return (
    <section id="utisci" aria-labelledby="utisci-title" className="bg-cream-50 py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            id="utisci-title"
            eyebrow={t.eyebrow}
            title={t.title}
            align="center"
            intro={siteContent.bookingScore ? <p>{fill(t.bookingScore, { n: siteContent.bookingScore })}</p> : undefined}
          />
        </Reveal>

        <ul className="mt-12 grid gap-6 md:mt-16 md:grid-cols-3 lg:gap-8">
          {reviews.slice(0, 3).map((review, i) => (
            <li key={review.author + i}>
              <Reveal delay={i * 100} className="h-full">
                <figure className="flex h-full flex-col rounded-xl bg-cream-100 p-8">
                  <div className="flex gap-1 text-gold-600" role="img" aria-label={fill(t.rating, { n: review.rating })}>
                    {Array.from({ length: 5 }, (_, star) => (
                      <Icon
                        key={star}
                        name="star"
                        className={`size-4 ${star < review.rating ? "fill-current" : "opacity-30"}`}
                      />
                    ))}
                  </div>
                  <blockquote className="mt-5 flex-1 font-serif text-xl italic leading-relaxed text-ink-900">
                    “{review.quote}”
                  </blockquote>
                  <figcaption className="mt-6 text-sm text-ink-600">
                    <span className="font-semibold text-ink-900">{review.author}</span> · {review.source}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
