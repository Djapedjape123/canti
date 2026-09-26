// Structured data for search engines and AI search.

type FaqItem = { q: string; a: string | null };

/** FAQPage with answered questions only. Returns null while nothing is answered. */
export function faqPageJsonLd(items: FaqItem[]) {
  const answered = items.filter((item): item is { q: string; a: string } => Boolean(item.a));
  if (answered.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: answered.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

// TODO(vlasnik): LodgingBusiness (name, address, priceRange, images) once the address is confirmed.

/** Safe to put inside <script type="application/ld+json">. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
