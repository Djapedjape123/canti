// Facts about the property that are the same in every language.
// Anything not confirmed by the owner is null and marked TODO(vlasnik);
// the UI hides or softens those parts instead of inventing data.

export type Review = {
  quote: string;
  author: string;
  source: "Booking" | "Google";
  rating: number; // 1–5
};

export type SiteContent = {
  phone: string | null;
  email: string | null;
  instagram: string | null;
  address: string | null;
  mapsQuery: string;
  whatsappNumber: string | null;
  bookingScore: string | null;
  reviews: Review[];
};

export const siteContent: SiteContent = {
  phone: null, // TODO(vlasnik): broj telefona
  email: null, // TODO(vlasnik): kontakt mejl
  instagram: null, // TODO(vlasnik): Instagram nalog (bez @), npr. "canti.apartmani"
  address: null, // TODO(vlasnik): tačna adresa (za mapu i JSON-LD)
  mapsQuery: "Podbara, Novi Sad", // TODO(vlasnik): zameniti tačnom adresom
  // TODO(vlasnik): broj za WhatsApp/Viber u međunarodnom formatu, bez + (npr. 381641234567)
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || null,
  bookingScore: null, // TODO(vlasnik): ocena sa Bookinga, npr. "9.6"
  // Only real reviews the owner approved. The section stays hidden while this is empty.
  reviews: [],
};

export function whatsappHref(message: string): string {
  const number = siteContent.whatsappNumber ?? "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function googleMapsHref(): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    siteContent.address ?? siteContent.mapsQuery,
  )}`;
}
