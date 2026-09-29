import "server-only";
import { Resend } from "resend";
import { formatDateShort, formatPrice } from "./format";

// Emails after a reservation request, sent through Resend.
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

async function send(who: "owner" | "guest", { to, ...message }: Message): Promise<void> {
  try {
    const from = required(process.env.EMAIL_FROM, "EMAIL_FROM");
    const recipient = required(to, who === "owner" ? "OWNER_EMAIL" : "guest email");
    // Resend does not throw on an API error, it returns it.
    const { error } = await getResend().emails.send({ from, to: recipient, ...message });
    if (error) throw new Error(`${error.name}: ${error.message}`);
  } catch (error) {
    // Never the address or the guest's data in the log, only why it failed.
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`[email] ${who} email failed: ${reason}`);
  }
}

function stayLine(d: ReservationEmailDetails): string {
  return `${formatDateShort(d.checkIn, "sr")} – ${formatDateShort(d.checkOut, "sr")} (noći: ${d.nightsCount})`;
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
