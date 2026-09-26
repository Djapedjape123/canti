import type { Dictionary } from "@/lib/dictionaries";
import { whatsappHref } from "@/lib/content";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";

type FinalCtaProps = {
  dict: Dictionary;
  bookHref: string;
  image?: string;
};

export function FinalCta({ dict, bookHref, image }: FinalCtaProps) {
  const t = dict.finalCta;

  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden bg-brand-900 py-24 md:py-32">
      <div className="absolute inset-0 -z-20">
        <Photo src={image} alt={t.imageAlt} sizes="100vw" plain />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-brand-900/70" />

      <Container className="text-center">
        <Reveal>
          <span aria-hidden="true" className="mx-auto block h-px w-16 bg-gold-500" />
          <h2
            id="cta-title"
            className="mx-auto mt-6 max-w-3xl font-serif text-[clamp(1.875rem,4vw,3rem)] font-semibold leading-tight text-cream-50 text-balance"
          >
            {t.title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-relaxed text-cream-50/80 md:text-lg">{t.text}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <ButtonLink href={bookHref} variant="gold" className="w-full sm:w-auto">
              {t.book}
            </ButtonLink>
            <ButtonLink
              href={whatsappHref(dict.contact.whatsappMessage)}
              variant="outline-light"
              className="w-full sm:w-auto"
            >
              <Icon name="whatsapp" className="size-5" strokeWidth={1.5} />
              {t.whatsapp}
            </ButtonLink>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
