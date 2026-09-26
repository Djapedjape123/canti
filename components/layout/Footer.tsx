import Link from "next/link";
import type { Dictionary } from "@/lib/dictionaries";
import { localizedPath, type Locale } from "@/lib/i18n";
import { siteContent } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Logo } from "./Logo";

type FooterProps = {
  lang: Locale;
  dict: Dictionary;
  apartments: { href: string; name: string }[];
  showReviews: boolean;
};

export function Footer({ lang, dict, apartments, showReviews }: FooterProps) {
  const home = localizedPath(lang);
  const t = dict.footer;

  const contacts: { icon: IconName; label: string | null; href?: string }[] = [
    { icon: "pin", label: siteContent.address },
    {
      icon: "phone",
      label: siteContent.phone,
      href: siteContent.phone ? `tel:${siteContent.phone.replace(/\s/g, "")}` : undefined,
    },
    {
      icon: "mail",
      label: siteContent.email,
      href: siteContent.email ? `mailto:${siteContent.email}` : undefined,
    },
    {
      icon: "instagram",
      label: siteContent.instagram ? `@${siteContent.instagram}` : null,
      href: siteContent.instagram ? `https://instagram.com/${siteContent.instagram}` : undefined,
    },
  ];

  const siteLinks = [
    { href: `${home}#apartmani`, label: dict.nav.apartments },
    { href: `${home}#lokacija`, label: dict.nav.location },
    ...(showReviews ? [{ href: `${home}#utisci`, label: dict.nav.reviews }] : []),
    { href: `${home}#pitanja`, label: dict.nav.faq },
  ];

  const linkClass = "inline-flex min-h-11 items-center transition-colors hover:text-gold-500";

  return (
    <footer id="kontakt" className="bg-brand-900 text-cream-50/80">
      <Container className="grid gap-12 py-16 md:grid-cols-2 md:py-20 lg:grid-cols-4">
        <div>
          <Logo href={home} tagline={dict.brand.tagline} />
          <p className="mt-6 max-w-xs text-sm leading-relaxed">{t.text}</p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">{t.contactTitle}</h2>
          <ul className="mt-4 grid gap-1 text-sm">
            {contacts.map((item) => (
              <li key={item.icon} className="flex items-center gap-3">
                <Icon name={item.icon} className="size-5 shrink-0 text-gold-500" />
                {item.label && item.href ? (
                  <a href={item.href} className={linkClass}>
                    {item.label}
                  </a>
                ) : (
                  <span className="inline-flex min-h-11 items-center text-cream-50/50">
                    {item.label ?? t.soon}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
            {t.apartmentsTitle}
          </h2>
          <ul className="mt-4 grid text-sm">
            {apartments.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">{t.linksTitle}</h2>
          <ul className="mt-4 grid text-sm">
            {siteLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-t border-cream-50/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-cream-50/60 sm:flex-row sm:justify-between">
          <p>© 2026 {dict.meta.siteName}</p>
          <p>{t.madeBy}</p>
        </Container>
      </div>
    </footer>
  );
}
