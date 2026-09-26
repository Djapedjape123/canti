import type { Apartment } from "@/lib/apartments";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Gallery } from "./Gallery";

type GallerySectionProps = {
  apartment: Apartment;
  lang: Locale;
  dict: Dictionary;
};

export function GallerySection({ apartment, lang, dict }: GallerySectionProps) {
  return (
    <section aria-labelledby="galerija-title" className="bg-cream-50 py-20 md:py-28">
      <Container>
        <Reveal>
          <SectionHeading id="galerija-title" eyebrow={dict.gallery.eyebrow} title={dict.gallery.title} />
        </Reveal>
        <div className="mt-12 md:mt-16">
          <Gallery
            images={apartment.images.map((image) => ({ src: image.src, alt: image.alt[lang] }))}
            labels={dict.gallery}
          />
        </div>
      </Container>
    </section>
  );
}
