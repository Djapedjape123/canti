"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/** How long "Potvrđeno ✓" stays on screen (same as in the price calendar). */
const NOTICE_MS = 6_000;

const ShowNotice = createContext<(message: string) => void>(() => {});

/**
 * Holds the message after a confirm or cancel. It lives above the list,
 * because the card itself often disappears after the change (a confirmed
 * request leaves the "Na čekanju" list).
 */
export function ReservationNoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <ShowNotice value={setNotice}>
      {children}
      {/* Always in the page, so screen readers announce the message when it appears. */}
      <div role="status" aria-live="polite">
        {notice ? (
          <p className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-cream-50 shadow-lg md:left-auto md:right-6 md:w-96">
            {notice}
          </p>
        ) : null}
      </div>
    </ShowNotice>
  );
}

export function useReservationNotice(): (message: string) => void {
  return useContext(ShowNotice);
}
