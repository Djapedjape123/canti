"use client";

import Link from "next/link";
import { useEffect, useState, type SubmitEvent } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-access";
import { blockNotice, readBlockResult, readCount, summaryLines, unblockNotice } from "@/lib/admin-blocks";
import {
  blockActions,
  parsePriceInput,
  rangeLabel,
  type DayRange,
  type NightReservation,
  type RangeSummary,
} from "@/lib/admin-calendar";
import { readGuestNotified, statusChangeNotice } from "@/lib/admin-reservations";
import { sendAdminChange } from "@/lib/admin-request";
import { adminText } from "@/lib/admin-text";

const t = adminText.editor;
const b = adminText.blocks;
const f = adminText.form;
const g = adminText.reservations.actions;
const noGuestName = adminText.reservations.noGuestName;

type Action = "save" | "reset" | "block" | "unblock";
type ErrorAction = Action | "cancelGuest";

/** Where each button sends the picked days. */
const REQUESTS = {
  save: { url: "/api/admin/prices", method: "PUT" },
  reset: { url: "/api/admin/prices", method: "DELETE" },
  block: { url: "/api/admin/blocks", method: "PUT" },
  unblock: { url: "/api/admin/blocks", method: "DELETE" },
} as const satisfies Record<Action, { url: string; method: "PUT" | "DELETE" }>;

type PriceEditorSheetProps = {
  apartmentSlug: string;
  /** The picked days (both ends included); null when nothing is picked. */
  range: DayRange | null;
  /** Only one tap so far: the owner may still tap the last day. */
  waitingForLastDay: boolean;
  /** The price all picked days share (prefills the input), or null. */
  initialPrice: number | null;
  /** Who holds the picked days; decides which of Blokiraj / Odblokiraj are on. */
  summary: RangeSummary | null;
  /** Set when the whole picked range is one pending/confirmed reservation. */
  guestReservation: NightReservation | null;
  /** Result of the last save, shown after the editor closes. */
  notice: string | null;
  onCancel: () => void;
  onDone: (notice: string) => void;
};

type EditorError = { action: ErrorAction; message: string; login: boolean };

/**
 * Phone: a sheet fixed to the bottom of the screen. Desktop (lg): a panel next
 * to the calendar. The parent gives it a new key for every range, so the input
 * starts from the prefilled price each time.
 */
export function PriceEditorSheet({
  apartmentSlug,
  range,
  waitingForLastDay,
  initialPrice,
  summary,
  guestReservation,
  notice,
  onCancel,
  onDone,
}: PriceEditorSheetProps) {
  const [value, setValue] = useState(initialPrice === null ? "" : String(initialPrice));
  const [error, setError] = useState<EditorError | null>(null);
  const [pending, setPending] = useState<ErrorAction | null>(null);
  const [askingGuestCancel, setAskingGuestCancel] = useState(false);

  // Esc closes the editor (not while a save is running).
  useEffect(() => {
    if (!range || pending) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [range, pending, onCancel]);

  if (!range) {
    return (
      <>
        <aside
          aria-labelledby="price-editor-idle-title"
          className="hidden rounded-xl bg-cream-50 p-5 shadow-sm ring-1 ring-sand-200 lg:sticky lg:top-6 lg:block"
        >
          <h2 id="price-editor-idle-title" className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">
            {t.title}
          </h2>
          {notice ? (
            <p role="status" className="mt-3 rounded-lg bg-brand-800 px-3 py-2 text-sm font-semibold text-cream-50">
              {notice}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-ink-600">{t.pickHint}</p>
        </aside>
        {notice ? (
          <p
            role="status"
            className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 rounded-xl bg-brand-800 px-4 py-3 text-sm font-semibold text-cream-50 shadow-lg lg:hidden"
          >
            {notice}
          </p>
        ) : null}
      </>
    );
  }

  const { from, to } = range;
  const label = rangeLabel(range);
  const allowed = summary ? blockActions(summary) : { block: true, unblock: true };
  const priceError = error?.action === "save";

  async function send(action: Action) {
    const price = action === "save" ? parsePriceInput(value) : null;
    if (action === "save" && price === null) {
      setError({ action, message: f.priceInvalid, login: false });
      return;
    }

    setPending(action);
    setError(null);
    const { url, method } = REQUESTS[action];
    const days = { slug: apartmentSlug, from, to };
    const result = await sendAdminChange(url, method, action === "save" ? { ...days, price } : days);
    if (!result.ok) {
      setError({ action, message: result.message, login: result.login });
      setPending(null);
      return;
    }

    if (action === "save") onDone(`${f.saved} · ${label} · ${price} €`);
    else if (action === "reset") onDone(`${t.resetDone} · ${label}`);
    else if (action === "block") onDone(blockNotice(readBlockResult(result.data)));
    else onDone(unblockNotice(readCount(result.data, "unblockedNights")));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    void send("save");
  }

  async function cancelGuestReservation() {
    if (!guestReservation) return;
    setPending("cancelGuest");
    setError(null);
    const result = await sendAdminChange(
      `/api/admin/reservations/${encodeURIComponent(guestReservation.id)}`,
      "PATCH",
      { status: "cancelled" },
    );
    if (!result.ok) {
      setError({ action: "cancelGuest", message: result.message, login: result.login });
      setPending(null);
      return;
    }
    setAskingGuestCancel(false);
    onDone(statusChangeNotice("cancelled", readGuestNotified(result.data)));
  }

  const errorMessage = error ? (
    <p
      id="price-error"
      role="alert"
      className="mt-3 rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm font-semibold text-ink-900"
    >
      {error.message}{" "}
      {error.login ? (
        <Link href={ADMIN_LOGIN_PATH} className="underline underline-offset-2">
          {f.loginAgain}
        </Link>
      ) : null}
    </p>
  ) : null;
  const isBlockError = error?.action === "block" || error?.action === "unblock";
  const isGuestError = error?.action === "cancelGuest";

  return (
    <section
      aria-labelledby="price-editor-title"
      className="fixed inset-x-0 bottom-0 z-30 max-h-[85svh] overflow-y-auto rounded-t-2xl bg-cream-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-lg ring-1 ring-sand-200 lg:sticky lg:inset-auto lg:top-6 lg:max-h-none lg:overflow-visible lg:rounded-xl lg:p-5 lg:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">{t.title}</p>
          <h2 id="price-editor-title" className="mt-1 font-serif text-xl font-semibold text-ink-900">
            {label}
          </h2>
          {waitingForLastDay ? <p className="mt-1 text-xs text-ink-600">{t.extendHint}</p> : null}
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending !== null}
          className="-mr-2 -mt-1 inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline disabled:opacity-60"
        >
          {t.cancel}
        </button>
      </div>

      {/* noValidate: our own check gives a Serbian message instead of the browser's. */}
      <form onSubmit={handleSubmit} noValidate className="mt-3">
        <label htmlFor="price-input" className="text-sm font-semibold text-ink-900">
          {t.priceLabel}
        </label>
        <div className="mt-1 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              id="price-input"
              name="price"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              enterKeyHint="done"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={priceError}
              aria-describedby={priceError ? "price-error" : undefined}
              className="min-h-11 w-full rounded-lg border border-sand-200 bg-white pl-3 pr-9 text-base text-ink-900 focus:border-brand-800"
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-600">
              €
            </span>
          </div>
          <button type="submit" disabled={pending !== null} className={buttonClasses("dark", "shrink-0")}>
            {pending === "save" ? f.saving : t.save}
          </button>
        </div>
      </form>

      {isBlockError || isGuestError ? null : errorMessage}

      <button
        type="button"
        onClick={() => void send("reset")}
        disabled={pending !== null}
        className={buttonClasses("outline-dark", "mt-3 w-full")}
      >
        {pending === "reset" ? f.saving : t.reset}
      </button>

      <div className="mt-4 border-t border-sand-200 pt-3">
        <h3 className="text-sm font-semibold text-ink-900">{b.heading}</h3>
        {summary ? (
          <ul className="mt-1 space-y-0.5 text-sm leading-relaxed text-ink-600">
            {summaryLines(summary).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void send("block")}
            disabled={pending !== null || !allowed.block}
            className={buttonClasses("outline-dark", "px-3")}
          >
            {pending === "block" ? b.blocking : b.block}
          </button>
          <button
            type="button"
            onClick={() => void send("unblock")}
            disabled={pending !== null || !allowed.unblock}
            className={buttonClasses("outline-dark", "px-3")}
          >
            {pending === "unblock" ? b.unblocking : b.unblock}
          </button>
        </div>
        {isBlockError ? errorMessage : null}
      </div>

      {guestReservation ? (
        <div className="mt-4 border-t border-sand-200 pt-3">
          <h3 className="text-sm font-semibold text-ink-900">{guestReservation.guestName ?? noGuestName}</h3>
          {askingGuestCancel ? (
            <>
              <p className="mt-1 font-semibold text-ink-900">{g.cancelQuestion}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
                {guestReservation.hasEmail ? g.cancelHintEmail : g.cancelHintNoEmail}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void cancelGuestReservation()}
                  disabled={pending !== null}
                  className={buttonClasses("dark", "px-3")}
                >
                  {pending === "cancelGuest" ? g.cancelling : g.cancelYes}
                </button>
                <button
                  type="button"
                  onClick={() => setAskingGuestCancel(false)}
                  disabled={pending !== null}
                  className={buttonClasses("outline-dark", "px-3")}
                >
                  {g.cancelNo}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAskingGuestCancel(true);
              }}
              disabled={pending !== null}
              className={buttonClasses("outline-dark", "mt-2 w-full")}
            >
              {g.cancel}
            </button>
          )}
          {isGuestError ? errorMessage : null}
        </div>
      ) : null}
    </section>
  );
}
