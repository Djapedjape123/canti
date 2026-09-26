import Link from "next/link";

type LogoProps = {
  href: string;
  tagline: string;
  onClick?: () => void;
};

export function Logo({ href, tagline, onClick }: LogoProps) {
  return (
    <Link href={href} onClick={onClick} className="group inline-flex flex-col leading-none">
      <span className="font-serif text-[1.75rem] font-bold tracking-[0.14em] text-gold-500 transition-colors group-hover:text-gold-600">
        ĆANTI
      </span>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-cream-50/70">
        {tagline}
      </span>
    </Link>
  );
}
