import "server-only";
import { Resend } from "resend";
import { formatDateShort, formatPrice } from "./format";

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

let client: Resend | undefined;
function getResend(): Resend {
  client ??= new Resend(required(process.env.RESEND_API_KEY, "RESEND_API_KEY"));
  return client;
}

type Message = { to: string | undefined; subject: string; text: string; replyTo?: string };

/** true when Resend accepted the email, false when it failed (already logged). */
async function send(who: "owner" | "guest", { to, ...message }: Message): Promise<boolean> {
  try {
    const from = required(process.env.EMAIL_FROM, "EMAIL_FROM");
    const recipient = required(to, who === "owner" ? "OWNER_EMAIL" : "guest email");
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

/** To the owner: everything needed to call the guest back, plus a link to confirm or cancel. */
export async function sendOwnerReservationEmail(d: ReservationEmailDetails): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  await send("owner", {
    to: process.env.OWNER_EMAIL,
    replyTo: d.guestEmail,
    subject: `Novi zahtev za rezervaciju: ${d.apartmentName}, ${formatDateShort(d.checkIn, "sr")}`,
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
  return send("guest", {
    to: d.guestEmail,
    replyTo: process.env.OWNER_EMAIL,
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
  const date = formatDateShort(d.checkIn, "sr");
  return send("guest", {
    to: d.guestEmail,
    replyTo: process.env.OWNER_EMAIL,
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
