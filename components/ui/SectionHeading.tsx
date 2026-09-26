import type { ReactNode } from "react";

type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
};

/** Eyebrow + thin gold line + serif H2. `id` goes on the H2 for aria-labelledby. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  tone = "light",
  align = "left",
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p
        className={`text-xs font-semibold uppercase tracking-[0.2em] ${
          tone === "dark" ? "text-gold-500" : "text-ink-600"
        }`}
      >
        {eyebrow}
      </p>
      <span
        aria-hidden="true"
        className={`mt-3 block h-px w-16 bg-gold-500 ${centered ? "mx-auto" : ""}`}
      />
      <h2
        id={id}
        className={`mt-5 font-serif text-[clamp(1.875rem,4vw,3rem)] font-semibold leading-tight ${
          tone === "dark" ? "text-cream-50" : "text-ink-900"
        }`}
      >
        {title}
      </h2>
      {intro ? (
        <div
          className={`mt-4 text-base leading-relaxed md:text-lg ${
            tone === "dark" ? "text-cream-50/80" : "text-ink-600"
          }`}
        >
          {intro}
        </div>
      ) : null}
    </div>
  );
}
