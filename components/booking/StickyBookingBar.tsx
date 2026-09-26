import { buttonClasses } from "@/components/ui/Button";

type StickyBookingBarProps = {
  /** e.g. "od 65 € / noć" */
  priceLabel: string;
  cta: string;
  targetId: string;
};

/** Mobile-only bottom bar that scrolls to the booking card. */
export function StickyBookingBar({ priceLabel, cta, targetId }: StickyBookingBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-200 bg-cream-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <p className="text-sm text-ink-600">{priceLabel}</p>
        <a href={`#${targetId}`} className={buttonClasses("dark", "px-5")}>
          {cta}
        </a>
      </div>
    </div>
  );
}
