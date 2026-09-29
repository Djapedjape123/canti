"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/Button";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-access";
import { readGuestNotified, statusChangeNotice, type StatusChange } from "@/lib/admin-reservations";
import { sendAdminChange } from "@/lib/admin-request";
import { adminText } from "@/lib/admin-text";
import { useReservationNotice } from "./ReservationNotice";

const t = adminText.reservations.actions;

type ReservationActionsProps = {
  id: string;
  canConfirm: boolean;
  canCancel: boolean;
  /** Decides the hint under "Otkazati ovu rezervaciju?". */
  guestHasEmail: boolean;
};

type ActionError = { message: string; login: boolean };

/**
 * Potvrdi / Otkaži on one card. Confirming is one tap; cancelling asks first,
 * because it frees the dates and emails the guest. The question appears ABOVE
 * the new buttons, so a quick double tap cannot land on "Da, otkaži".
 */
export function ReservationActions({ id, canConfirm, canCancel, guestHasEmail }: ReservationActionsProps) {
  const router = useRouter();
  const showNotice = useReservationNotice();
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState<StatusChange | null>(null);
  const [error, setError] = useState<ActionError | null>(null);
  const noButton = useRef<HTMLButtonElement>(null);
  const busy = sending !== null;

  // The "Otkaži" button disappears with the question: keyboard focus moves to the safe answer.
  useEffect(() => {
    if (asking) noButton.current?.focus();
  }, [asking]);

  async function change(status: StatusChange) {
    setSending(status);
    setError(null);
    const result = await sendAdminChange(`/api/admin/reservations/${encodeURIComponent(id)}`, "PATCH", { status });
    setSending(null);
    setAsking(false);
    if (!result.ok) {
      setError(result);
      return;
    }
    showNotice(statusChangeNotice(status, readGuestNotified(result.data)));
    // New status on the card and a new count in the menu; a confirmed request leaves "Na čekanju".
    router.refresh();
  }

  function askToCancel() {
    setError(null);
    setAsking(true);
  }

  return (
    <div role="group" aria-label={t.label} className="mt-3 border-t border-sand-200 pt-3">
      {asking ? (
        <>
          <p className="font-semibold text-ink-900">{t.cancelQuestion}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
            {guestHasEmail ? t.cancelHintEmail : t.cancelHintNoEmail}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              disabled={busy}
              onClick={() => change("cancelled")}
              className={buttonClasses("dark")}
            >
              {sending === "cancelled" ? t.cancelling : t.cancelYes}
            </button>
            <button
              ref={noButton}
              type="button"
              disabled={busy}
              onClick={() => setAsking(false)}
              className={buttonClasses("outline-dark")}
            >
              {t.cancelNo}
            </button>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {canConfirm ? (
            <button type="button" disabled={busy} onClick={() => change("confirmed")} className={buttonClasses("dark")}>
              {sending === "confirmed" ? t.confirming : t.confirm}
            </button>
          ) : null}
          {canCancel ? (
            <button type="button" disabled={busy} onClick={askToCancel} className={buttonClasses("outline-dark")}>
              {t.cancel}
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm font-semibold text-ink-900"
        >
          {error.message}{" "}
          {error.login ? (
            <Link href={ADMIN_LOGIN_PATH} className="underline underline-offset-2">
              {adminText.form.loginAgain}
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
