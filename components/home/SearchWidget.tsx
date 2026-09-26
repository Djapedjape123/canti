"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Dictionary } from "@/lib/dictionaries";
import { addDays, todayInBelgrade } from "@/lib/dates";
import { Icon } from "@/components/ui/Icon";

type SearchWidgetProps = {
  labels: Dictionary["search"];
  guestOptions: { value: number; label: string }[];
  /** Demo: the featured apartment page. Later: list of available apartments. */
  targetPath: string;
};

const fieldClass =
  "mt-1.5 block min-h-11 w-full rounded-lg border border-sand-200 bg-cream-50 px-3 text-base text-ink-900 transition-colors focus:border-brand-800 focus:outline-none";

export function SearchWidget({ labels, guestOptions, targetPath }: SearchWidgetProps) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(guestOptions.at(-1)?.value ?? 1);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));
    router.push(`${targetPath}?${params.toString()}#rezervacija`);
  };

  return (
    <form
      onSubmit={onSubmit}
      aria-label={labels.title}
      className="grid grid-cols-2 gap-3 rounded-xl bg-cream-50 p-4 text-left shadow-lg md:p-5 lg:grid-cols-[1fr_1fr_0.8fr_auto] lg:items-end lg:gap-4"
    >
      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-600">
        {labels.checkIn}
        {/* "min" is set on focus (not at render) so a statically built page never shows a stale "today". */}
        <input
          type="date"
          name="checkIn"
          value={checkIn}
          onFocus={(event) => {
            event.currentTarget.min = todayInBelgrade();
          }}
          onChange={(event) => {
            const value = event.target.value;
            setCheckIn(value);
            // check_out is exclusive, so it must be at least one day after check-in.
            if (checkOut && value && checkOut <= value) setCheckOut("");
          }}
          className={fieldClass}
        />
      </label>

      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-600">
        {labels.checkOut}
        <input
          type="date"
          name="checkOut"
          value={checkOut}
          onFocus={(event) => {
            event.currentTarget.min = addDays(checkIn || todayInBelgrade(), 1);
          }}
          onChange={(event) => setCheckOut(event.target.value)}
          className={fieldClass}
        />
      </label>

      <label className="col-span-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-600 lg:col-span-1">
        {labels.guests}
        <select
          name="guests"
          value={guests}
          onChange={(event) => setGuests(Number(event.target.value))}
          className={fieldClass}
        >
          {guestOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-800 px-7 text-sm font-semibold tracking-wide text-cream-50 transition-colors hover:bg-brand-700 lg:col-span-1"
      >
        <Icon name="calendar" className="size-5" strokeWidth={1.5} />
        {labels.submit}
      </button>
    </form>
  );
}
