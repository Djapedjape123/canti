import Image from "next/image";
import { Icon } from "./Icon";

type PhotoProps = {
  /** When missing, a brand-colored placeholder is shown instead. */
  src?: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  className?: string;
  placeholderLabel?: string;
  /** Hide the placeholder icon (e.g. behind hero text). */
  plain?: boolean;
};

/**
 * Fills its parent (parent must be `relative` with a size).
 * Real photos: add `src` in lib/apartments.ts, no component changes needed.
 */
export function Photo({ src, alt, sizes, preload, className = "", placeholderLabel, plain }: PhotoProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div role="img" aria-label={alt} className={`photo-placeholder absolute inset-0 ${className}`}>
      <div
        hidden={plain} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gold-500/50">
        <Icon name="image" className="size-8" />
        {placeholderLabel ? (
          <span aria-hidden="true" className="text-[11px] uppercase tracking-[0.2em]">
            {placeholderLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
