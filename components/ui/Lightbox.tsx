"use client";

import { useEffect, useRef } from "react";
import { fill } from "@/lib/format";
import { Icon } from "./Icon";
import { Photo } from "./Photo";

export type LightboxImage = { src?: string; alt: string };

export type LightboxLabels = {
  close: string;
  previous: string;
  next: string;
  counter: string;
  placeholder: string;
};

type LightboxProps = {
  images: LightboxImage[];
  /** null = closed */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  labels: LightboxLabels;
};

const SWIPE_THRESHOLD = 50;

/**
 * Built on native <dialog>: showModal() gives focus trapping, Esc to close
 * and a backdrop for free. Arrow keys and swipe switch photos.
 */
export function Lightbox({ images, index, onIndexChange, labels }: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const total = images.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  const go = (step: number) => {
    if (index === null) return;
    onIndexChange((index + step + total) % total);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") go(-1);
    if (event.key === "ArrowRight") go(1);
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
  };

  const current = index !== null ? images[index] : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onIndexChange(null)}
      onKeyDown={onKeyDown}
      aria-label={current?.alt}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-cream-50 backdrop:bg-brand-900/95"
    >
      {current ? (
        <div
          className="relative flex h-full w-full flex-col"
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0].clientX;
          }}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex items-center justify-between px-5 py-4 md:px-8">
            <p className="text-sm tracking-[0.2em] text-cream-50/70" aria-live="polite">
              {fill(labels.counter, { n: (index ?? 0) + 1, total })}
            </p>
            <button
              type="button"
              onClick={() => onIndexChange(null)}
              aria-label={labels.close}
              className="grid size-11 place-items-center rounded-full text-cream-50 transition-colors hover:text-gold-500"
            >
              <Icon name="close" className="size-7" />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-2 pb-8 md:px-20">
            <figure className="relative h-full max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-xl">
              <Photo
                src={current.src}
                alt={current.alt}
                sizes="100vw"
                className="object-contain"
                placeholderLabel={labels.placeholder}
              />
            </figure>

            {total > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={labels.previous}
                  className="absolute left-2 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-cream-50/30 transition-colors hover:border-gold-500 hover:text-gold-500 md:left-6 md:grid"
                >
                  <Icon name="chevronLeft" className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={labels.next}
                  className="absolute right-2 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-cream-50/30 transition-colors hover:border-gold-500 hover:text-gold-500 md:right-6 md:grid"
                >
                  <Icon name="chevronRight" className="size-6" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
