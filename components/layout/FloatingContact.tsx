"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

type FloatingContactProps = {
  href: string;
  label: string;
};

/** Gold WhatsApp button. On apartment pages it sits above the mobile sticky booking bar. */
export function FloatingContact({ href, label }: FloatingContactProps) {
  const pathname = usePathname();
  const aboveStickyBar = pathname.includes("/apartmani/");

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-gold-500 text-brand-900 shadow-lg transition-colors hover:bg-gold-600 md:right-6 ${
        aboveStickyBar ? "bottom-24 lg:bottom-6" : "bottom-5 md:bottom-6"
      }`}
    >
      <Icon name="whatsapp" className="size-7" strokeWidth={1.5} />
    </a>
  );
}
