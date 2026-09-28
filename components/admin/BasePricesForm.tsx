"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-access";
import { parsePriceInput } from "@/lib/admin-calendar";
import { sendAdminChange } from "@/lib/admin-request";
import { adminText } from "@/lib/admin-text";
import { fill, formatPrice } from "@/lib/format";
import { lowestBasePrice, type BasePrices } from "@/lib/pricing";

const t = adminText.settings;
const f = adminText.form;

type PriceKey = keyof BasePrices;

// The three base prices: name in the app, column in the database, labels.
const FIELDS: {
  key: PriceKey;
  column: "price_weekday" | "price_friday" | "price_saturday";
  label: string;
  hint: string;
}[] = [
  { key: "priceWeekday", column: "price_weekday", label: t.weekday, hint: t.weekdayHint },
  { key: "priceFriday", column: "price_friday", label: t.friday, hint: t.fridayHint },
  { key: "priceSaturday", column: "price_saturday", label: t.saturday, hint: t.saturdayHint },
];

type BasePricesFormProps = {
  slug: string;
  name: string;
  /** The prices saved in the database. */
  prices: BasePrices;
};

type FormError = { message: string; login: boolean };

/** One apartment's base prices; Save sends PATCH /api/admin/apartments/[slug]. */
export function BasePricesForm({ slug, name, prices }: BasePricesFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<PriceKey, string>>({
    priceWeekday: String(prices.priceWeekday),
    priceFriday: String(prices.priceFriday),
    priceSaturday: String(prices.priceSaturday),
  });
  const [invalid, setInvalid] = useState<PriceKey[]>([]);
  const [error, setError] = useState<FormError | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const fieldId = (key: PriceKey) => `${slug}-${key}`;

  function change(key: PriceKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = FIELDS.map((field) => ({ ...field, price: parsePriceInput(values[field.key]) }));
    const wrong = parsed.filter((field) => field.price === null).map((field) => field.key);
    setInvalid(wrong);
    setSaved(false);
    setError(null);
    if (wrong.length > 0) {
      // Put the cursor in the first wrong field, so the owner sees what to fix.
      document.getElementById(fieldId(wrong[0]))?.focus();
      return;
    }

    setPending(true);
    const body = Object.fromEntries(parsed.map((field) => [field.column, field.price]));
    const result = await sendAdminChange(`/api/admin/apartments/${encodeURIComponent(slug)}`, "PATCH", body);
    setPending(false);
    if (!result.ok) {
      setError(result);
      return;
    }
    setSaved(true);
    // Loads the saved prices from the server (the "od X €" line and the calendar use them).
    router.refresh();
  }

  return (
    // noValidate: our own check gives a Serbian message instead of the browser's.
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={`${slug}-title`}
      className="rounded-xl bg-cream-50 p-5 shadow-sm ring-1 ring-sand-200"
    >
      <h2 id={`${slug}-title`} className="font-serif text-2xl font-semibold text-ink-900">
        {name}
      </h2>
      <p className="mt-1 text-sm text-ink-600">
        {fill(t.fromPrice, { price: formatPrice(lowestBasePrice(prices), "sr") })}
      </p>

      <div className="mt-5 grid gap-4">
        {FIELDS.map((field) => {
          const id = fieldId(field.key);
          const isInvalid = invalid.includes(field.key);
          return (
            <div key={field.key}>
              <label htmlFor={id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-semibold text-ink-900">{field.label}</span>
                <span className="text-xs text-ink-600">{field.hint}</span>
              </label>
              <div className="relative mt-1">
                <input
                  id={id}
                  name={field.column}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={values[field.key]}
                  onChange={(event) => change(field.key, event.target.value)}
                  aria-invalid={isInvalid}
                  aria-describedby={isInvalid ? `${id}-error` : undefined}
                  className={`min-h-11 w-full rounded-lg border bg-white pl-3 pr-9 text-base text-ink-900 focus:border-brand-800 ${
                    isInvalid ? "border-ink-900" : "border-sand-200"
                  }`}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-600"
                >
                  €
                </span>
              </div>
              {isInvalid ? (
                <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-ink-900">
                  {f.priceInvalid}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm font-semibold text-ink-900">
          {error.message}{" "}
          {error.login ? (
            <Link href={ADMIN_LOGIN_PATH} className="underline underline-offset-2">
              {f.loginAgain}
            </Link>
          ) : null}
        </p>
      ) : null}

      {saved ? (
        <p role="status" className="mt-4 rounded-lg bg-brand-800 px-3 py-2 text-sm font-semibold text-cream-50">
          {f.saved}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={buttonClasses("dark", "mt-5 w-full")}>
        {pending ? f.saving : t.save}
      </button>
    </form>
  );
}
