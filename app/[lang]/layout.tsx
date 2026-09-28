import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingContact } from "@/components/layout/FloatingContact";
import { getApartments } from "@/lib/apartments";
import { siteContent, whatsappHref } from "@/lib/content";
import { getDictionary } from "@/lib/dictionaries";
import { fontVariables } from "@/lib/fonts";
import { formatPrice } from "@/lib/format";
import { apartmentPath, hasLocale, htmlLang, locales, localizedPath } from "@/lib/i18n";
import { lowestBasePrice } from "@/lib/pricing";
import "../globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: "#143b3b",
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: dict.meta.title, template: `%s · ${dict.meta.siteName}` },
    description: dict.meta.description,
    applicationName: dict.meta.siteName,
    openGraph: {
      type: "website",
      siteName: dict.meta.siteName,
      locale: lang === "sr" ? "sr_RS" : "en_GB",
    },
  };
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = getDictionary(lang);
  const apartments = await getApartments();
  const featured = apartments[0];
  const showReviews = siteContent.reviews.length > 0;

  const navApartments = apartments.map((apartment) => ({
    href: apartmentPath(lang, apartment.slug),
    name: apartment.name,
    meta: `${dict.apartments.from} ${formatPrice(lowestBasePrice(apartment), lang)} ${dict.apartments.perNight}`,
  }));

  const bookHref = featured
    ? `${apartmentPath(lang, featured.slug)}#rezervacija`
    : `${localizedPath(lang)}#apartmani`;

  return (
    <html lang={htmlLang[lang]} className={fontVariables}>
      <body className="flex min-h-svh flex-col font-sans antialiased">
        <noscript>
          <style>{`[data-reveal="hidden"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <Header
          lang={lang}
          labels={dict.nav}
          tagline={dict.brand.tagline}
          apartments={navApartments}
          bookHref={bookHref}
          showReviews={showReviews}
        />
        <main id="sadrzaj" className="flex-1">
          {children}
        </main>
        <Footer lang={lang} dict={dict} apartments={navApartments} showReviews={showReviews} />
        <FloatingContact
          href={whatsappHref(dict.contact.whatsappMessage)}
          label={dict.contact.whatsappLabel}
        />
      </body>
    </html>
  );
}
