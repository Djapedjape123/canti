import type { Dictionary } from "@/lib/dictionaries";
import { fill } from "@/lib/format";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { Photo } from "@/components/ui/Photo";
import { SearchWidget } from "./SearchWidget";

type HeroProps = {
  dict: Dictionary;
  image?: string;
  /** Already formatted, e.g. "65 €". Read from data, never hardcoded. */
  fromPrice: string;
  guestOptions: { value: number; label: string }[];
  searchTarget: string;
};

export function Hero({ dict, image, fromPrice, guestOptions, searchTarget }: HeroProps) {
  const t = dict.hero;

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-brand-900"
    >
      <div className="absolute inset-0 -z-20 animate-hero-zoom">
        <Photo src={image} alt={t.imageAlt} sizes="100vw" preload plain />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-t from-brand-900/80 via-brand-900/40 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-brand-900/60 to-transparent"
      />

      <Container className="pb-12 pt-32 md:pb-20 md:pt-40">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500 md:text-[13px]">
            {t.eyebrow}
          </p>
          <span aria-hidden="true" className="mt-3 block h-px w-16 bg-gold-500" />
          <h1
            id="hero-title"
            className="mt-6 font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] text-cream-50 text-balance"
          >
            {t.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-cream-50/85 md:text-lg">
            {t.subtitle}
          </p>
        </div>

        <div className="mt-10 lg:max-w-5xl">
          <SearchWidget labels={dict.search} guestOptions={guestOptions} targetPath={searchTarget} />
          <p className="mt-4 text-sm text-cream-50/80">
            {fill(t.note, { price: fromPrice })}
          </p>
        </div>
      </Container>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-6 hidden justify-center md:flex"
      >
        <Icon name="chevronDown" className="size-6 animate-bounce-soft text-cream-50/60" strokeWidth={1.5} />
      </div>
    </section>
  );
}
