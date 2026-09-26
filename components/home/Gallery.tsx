"use client";

import { useState } from "react";
import { fill } from "@/lib/format";
import { Lightbox, type LightboxImage, type LightboxLabels } from "@/components/ui/Lightbox";
import { Photo } from "@/components/ui/Photo";

type GalleryProps = {
  images: LightboxImage[];
  labels: LightboxLabels & { open: string };
};

const VISIBLE = 5;

/**
 * Desktop: one large + four small photos. Mobile: horizontal scroll with snap.
 * Every photo opens the lightbox (all photos, not just the visible five).
 */
export function Gallery({ images, labels }: GalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const total = images.length;

  return (
    <>
      <ul className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:h-[34rem] md:grid-cols-4 md:grid-rows-2 md:gap-4 md:overflow-visible md:px-0">
        {images.slice(0, VISIBLE).map((image, i) => (
          <li
            key={i}
            className={`relative aspect-4/3 w-[85%] shrink-0 snap-start overflow-hidden rounded-xl md:aspect-auto md:w-auto ${
              i === 0 ? "md:col-span-2 md:row-span-2" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={fill(labels.open, { n: i + 1, total })}
              className="group absolute inset-0 overflow-hidden rounded-xl"
            >
              <Photo
                src={image.src}
                alt={image.alt}
                sizes={i === 0 ? "(min-width: 768px) 50vw, 85vw" : "(min-width: 768px) 25vw, 85vw"}
                className="transition-transform duration-700 ease-out group-hover:scale-105"
                placeholderLabel={labels.placeholder}
              />
            </button>
          </li>
        ))}
      </ul>

      <Lightbox images={images} index={openIndex} onIndexChange={setOpenIndex} labels={labels} />
    </>
  );
}
