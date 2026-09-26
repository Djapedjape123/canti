import type { MetadataRoute } from "next";
import { getApartments } from "@/lib/apartments";
import { apartmentPath, locales, localizedPath } from "@/lib/i18n";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// /admin is intentionally not listed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const apartments = await getApartments();
  const paths: { build: (lang: (typeof locales)[number]) => string; priority: number }[] = [
    { build: (lang) => localizedPath(lang), priority: 1 },
    ...apartments.map((apartment) => ({
      build: (lang: (typeof locales)[number]) => apartmentPath(lang, apartment.slug),
      priority: 0.8,
    })),
  ];

  return paths.flatMap(({ build, priority }) =>
    locales.map((lang) => ({
      url: `${siteUrl}${build(lang)}`,
      changeFrequency: "weekly" as const,
      priority,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${siteUrl}${build(l)}`])),
      },
    })),
  );
}
