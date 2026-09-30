import "server-only";
import { Resend } from "resend";
import { formatDateLong, formatDateShort, formatPrice } from "./format";

// Emails about reservations, sent through Resend.
// Every send is best-effort: a missing env var or a failed send is logged
// and swallowed, because the reservation is already saved and must stay
// (CLAUDE.md: "Ako mejl ne uspe, rezervacija ostaje").

export type ReservationEmailDetails = {
  apartmentName: string;
  checkIn: string;
  checkOut: string;
  nightsCount: number;
  total: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guests: number;
};

/**
 * For the emails after the owner confirms or cancels. Manual (phone)
 * reservations may lack some fields, so those lines are left out.
 */
export type GuestStatusEmailDetails = {
  apartmentName: string;
  checkIn: string;
  checkOut: string;
  nightsCount: number;
  total: number | null;
  guestName: string | null;
  guestEmail: string;
  guests: number | null;
};

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

/**
 * Guest emails stay off until a verified domain is set in Resend (sandbox
 * senders can only deliver to the account's own address). Flip
 * RESEND_GUEST_EMAILS_ENABLED to "true" in env once that's done.
 */
function guestEmailsEnabled(): boolean {
  return process.env.RESEND_GUEST_EMAILS_ENABLED === "true";
}

let client: Resend | undefined;
function getResend(): Resend {
  client ??= new Resend(required(process.env.RESEND_API_KEY, "RESEND_API_KEY"));
  return client;
}

type Message = { to: string | undefined; subject: string; text: string; html?: string; replyTo?: string };

/** true when Resend accepted the email, false when it failed (already logged). */
async function send(who: "owner" | "guest", { to, ...message }: Message): Promise<boolean> {
  try {
    const from = required(process.env.EMAIL_FROM, "EMAIL_FROM");
    const recipient = required(to, who === "owner" ? "RESERVATION_NOTIFICATION_EMAIL" : "guest email");
    // Resend does not throw on an API error, it returns it.
    const { error } = await getResend().emails.send({ from, to: recipient, ...message });
    if (error) throw new Error(`${error.name}: ${error.message}`);
    return true;
  } catch (error) {
    // Never the address or the guest's data in the log, only why it failed.
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`[email] ${who} email failed: ${reason}`);
    return false;
  }
}

function stayLine(d: { checkIn: string; checkOut: string; nightsCount: number }): string {
  return `${formatDateShort(d.checkIn, "sr")} – ${formatDateShort(d.checkOut, "sr")} (noći: ${d.nightsCount})`;
}

function greeting(guestName: string | null): string {
  return guestName ? `Poštovani/a ${guestName},` : `Poštovani/a,`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#55605F;font-size:13px;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;color:#1C2626;font-size:14px;font-weight:600;vertical-align:top;">${value}</td>
  </tr>`;
}

/** HTML version of the owner's "new request" email, in the site's brand colors. */
function ownerReservationHtml(d: ReservationEmailDetails, siteUrl: string | undefined): string {
  const adminUrl = siteUrl ? `${siteUrl}/admin/rezervacije` : "#";
  const stayLine = `${formatDateLong(d.checkIn, "sr")} – ${formatDateLong(d.checkOut, "sr")}`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E6DCCB;">
      <tr><td style="background-color:#143B3B;padding:28px 32px;">
        <p style="margin:0;color:#C8A56A;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Novi zahtev za rezervaciju</p>
        <p style="margin:6px 0 0;color:#C8A56A;font-size:24px;font-weight:600;letter-spacing:1px;">ĆANTI</p>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="margin:0 0 20px;color:#1C2626;font-size:15px;line-height:1.5;">Stigao je novi zahtev za rezervaciju apartmana <strong>${escapeHtml(d.apartmentName)}</strong>, čeka vašu potvrdu.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${detailRow("Apartman", escapeHtml(d.apartmentName))}
          ${detailRow("Termin", `${stayLine} (noći: ${d.nightsCount})`)}
          ${detailRow("Ukupno", formatPrice(d.total, "sr"))}
          ${detailRow("Broj gostiju", String(d.guests))}
        </table>
        <div style="margin:20px 0;border-top:1px solid #E6DCCB;"></div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          ${detailRow("Gost", escapeHtml(d.guestName))}
          ${detailRow("Telefon", escapeHtml(d.guestPhone))}
          ${detailRow("Mejl", escapeHtml(d.guestEmail))}
        </table>
        <div style="margin-top:28px;text-align:center;">
          <a href="${adminUrl}" style="display:inline-block;background-color:#C8A56A;color:#0F2E2E;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:9999px;">Potvrdite ili otkažite</a>
        </div>
      </td></tr>
      <tr><td style="background-color:#F3EDE3;padding:16px 32px;">
        <p style="margin:0;color:#55605F;font-size:12px;">Ćanti Apartmani · automatska poruka</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

/** To the owner: everything needed to call the guest back, plus a link to confirm or cancel. */
export async function sendOwnerReservationEmail(d: ReservationEmailDetails): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  await send("owner", {
    to: process.env.RESERVATION_NOTIFICATION_EMAIL,
    replyTo: d.guestEmail,
    subject: `Novi zahtev za rezervaciju: ${d.apartmentName}, ${formatDateShort(d.checkIn, "sr")}`,
    html: ownerReservationHtml(d, siteUrl),
    text: [
      `Stigao je novi zahtev za rezervaciju (čeka vašu potvrdu).`,
      ``,
      `Apartman: ${d.apartmentName}`,
      `Termin: ${stayLine(d)}`,
      `Ukupno: ${formatPrice(d.total, "sr")}`,
      `Broj gostiju: ${d.guests}`,
      ``,
      `Gost: ${d.guestName}`,
      `Telefon: ${d.guestPhone}`,
      `Mejl: ${d.guestEmail}`,
      ``,
      siteUrl ? `Potvrdite ili otkažite: ${siteUrl}/admin/rezervacije` : `Potvrdite ili otkažite u admin panelu.`,
    ].join("\n"),
  });
}

/** To the guest: the request arrived. It is NOT a confirmation, the owner confirms. */
export async function sendGuestReservationEmail(d: ReservationEmailDetails): Promise<void> {
  if (!guestEmailsEnabled()) return;
  await send("guest", {
    to: d.guestEmail,
    subject: `Primili smo vaš zahtev za rezervaciju – ${d.apartmentName}`,
    text: [
      `Poštovani/a ${d.guestName},`,
      ``,
      `hvala na zahtevu za rezervaciju apartmana ${d.apartmentName}.`,
      ``,
      `Termin: ${stayLine(d)}`,
      `Broj gostiju: ${d.guests}`,
      `Ukupno: ${formatPrice(d.total, "sr")}`,
      ``,
      `Ovo je zahtev, a ne konačna potvrda. Vlasnik ga proverava i javlja vam se uskoro, obično u toku dana.`,
      ``,
      `Ćanti Apartmani`,
    ].join("\n"),
  });
}

/** The stay details the guest already knows from the request email; missing ones are skipped. */
function stayDetails(d: GuestStatusEmailDetails): string[] {
  return [
    `Termin: ${stayLine(d)}`,
    ...(d.guests !== null ? [`Broj gostiju: ${d.guests}`] : []),
    ...(d.total !== null ? [`Ukupno: ${formatPrice(d.total, "sr")}`] : []),
  ];
}

/** To the guest after the owner confirmed. Replies go to the owner. */
export async function sendGuestConfirmedEmail(d: GuestStatusEmailDetails): Promise<boolean> {
  if (!guestEmailsEnabled()) return false;
  return send("guest", {
    to: d.guestEmail,
    replyTo: process.env.RESERVATION_NOTIFICATION_EMAIL,
    subject: `Rezervacija potvrđena – ${d.apartmentName}, ${formatDateShort(d.checkIn, "sr")}`,
    text: [
      greeting(d.guestName),
      ``,
      `vaša rezervacija apartmana ${d.apartmentName} je potvrđena.`,
      ``,
      ...stayDetails(d),
      ``,
      `Radujemo se vašem dolasku. Ako imate pitanja, odgovorite na ovaj mejl.`,
      ``,
      `Ćanti Apartmani`,
    ].join("\n"),
  });
}

/**
 * To the guest after the owner cancelled. A request that was never confirmed
 * gets "we cannot confirm it"; a confirmed reservation gets "it is cancelled".
 */
export async function sendGuestCancelledEmail(d: GuestStatusEmailDetails, wasConfirmed: boolean): Promise<boolean> {
  if (!guestEmailsEnabled()) return false;
  const date = formatDateShort(d.checkIn, "sr");
  return send("guest", {
    to: d.guestEmail,
    replyTo: process.env.RESERVATION_NOTIFICATION_EMAIL,
    subject: wasConfirmed
      ? `Rezervacija otkazana – ${d.apartmentName}, ${date}`
      : `Zahtev za rezervaciju nije potvrđen – ${d.apartmentName}, ${date}`,
    text: [
      greeting(d.guestName),
      ``,
      wasConfirmed
        ? `vaša rezervacija apartmana ${d.apartmentName} je otkazana.`
        : `nažalost, ne možemo da potvrdimo vaš zahtev za rezervaciju apartmana ${d.apartmentName}.`,
      ``,
      ...stayDetails(d),
      ``,
      `Ako želite drugi termin ili imate pitanja, odgovorite na ovaj mejl.`,
      ``,
      `Ćanti Apartmani`,
    ].join("\n"),
  });
}
