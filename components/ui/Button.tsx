import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// gold      → primary on dark backgrounds
// dark      → primary on light backgrounds
// outline-light / outline-dark → secondary on dark / light backgrounds
export type ButtonVariant = "gold" | "dark" | "outline-light" | "outline-dark";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  gold: "bg-gold-500 text-brand-900 hover:bg-gold-600",
  dark: "bg-brand-800 text-cream-50 hover:bg-brand-700",
  "outline-light": "border border-cream-50/40 text-cream-50 hover:border-gold-500 hover:text-gold-500",
  "outline-dark": "border border-brand-800/30 text-brand-800 hover:border-brand-800 hover:bg-brand-800/5",
};

export function buttonClasses(variant: ButtonVariant, className = ""): string {
  return `${base} ${variants[variant]} ${className}`;
}

type ButtonLinkProps = {
  href: string;
  variant: ButtonVariant;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

export function ButtonLink({ href, variant, className, children, ...rest }: ButtonLinkProps) {
  const classes = buttonClasses(variant, className);
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant: ButtonVariant };

export function Button({ variant, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}
