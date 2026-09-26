import { lang } from "next/root-params";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getDictionary } from "@/lib/dictionaries";
import { defaultLocale, hasLocale, localizedPath } from "@/lib/i18n";

// not-found.tsx gets no props, so the language comes from next/root-params.
export default async function NotFound() {
  const value = await lang();
  const locale = hasLocale(value) ? value : defaultLocale;
  const t = getDictionary(locale).notFound;

  return (
    <section className="bg-brand-800 pb-24 pt-40 text-center text-cream-50 md:pt-48">
      <Container>
        <p className="font-serif text-7xl font-semibold text-gold-500">404</p>
        <span aria-hidden="true" className="mx-auto mt-6 block h-px w-16 bg-gold-500" />
        <h1 className="mt-6 font-serif text-4xl font-semibold">{t.title}</h1>
        <p className="mx-auto mt-4 max-w-md text-cream-50/80">{t.text}</p>
        <ButtonLink href={localizedPath(locale)} variant="gold" className="mt-10">
          {t.back}
        </ButtonLink>
      </Container>
    </section>
  );
}
