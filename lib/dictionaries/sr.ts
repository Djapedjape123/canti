// All Serbian UI text. en.ts must have exactly the same keys (enforced by the Dictionary type).
// Placeholders like {price} are filled with fill() from lib/format.ts.
// Answers set to null are TODO(vlasnik): the UI shows a soft "coming soon" text instead.

export const sr = {
  meta: {
    siteName: "Ćanti Apartmani",
    title: "Apartman sa đakuzijem Novi Sad | Ćanti Apartmani, Podbara",
    description:
      "Apartmani sa privatnim đakuzijem na Podbari u Novom Sadu. Romantičan vikend, godišnjica ili proslava. Rezervišite direktno, bez posrednika.",
    apartmentTitle: "{name} | Apartman sa đakuzijem, Novi Sad",
  },
  brand: {
    tagline: "Apartmani sa đakuzijem",
  },
  nav: {
    apartments: "Apartmani",
    location: "Lokacija",
    reviews: "Utisci",
    faq: "Pitanja",
    contact: "Kontakt",
    book: "Rezerviši",
    home: "Početna",
    openMenu: "Otvori meni",
    closeMenu: "Zatvori meni",
    language: "Jezik",
    mainNav: "Glavna navigacija",
  },
  hero: {
    eyebrow: "Novi Sad · Podbara",
    title: "Vaš privatni đakuzi u srcu Novog Sada",
    subtitle: "Apartmani za romantične vikende, proslave i trenutke samo za vas dvoje.",
    imageAlt: "Đakuzi u apartmanu uveče, pod toplim svetlom",
    note: "Direktna rezervacija · bez posrednika · od {price} / noć",
  },
  search: {
    title: "Proverite slobodne termine",
    checkIn: "Datum dolaska",
    checkOut: "Datum odlaska",
    guests: "Broj gostiju",
    guestOne: "{n} gost",
    guestFew: "{n} gosta",
    guestMany: "{n} gostiju",
    submit: "Proveri dostupnost",
  },
  highlights: {
    label: "Prednosti",
    jacuzzi: { title: "Privatni đakuzi", detail: "U samom apartmanu" },
    location: { title: "Podbara, Novi Sad", detail: null as string | null }, // TODO(vlasnik): "X min pešaka do centra"
    parking: { title: "Parking", detail: null as string | null }, // TODO(vlasnik): vrsta parkinga
    checkin: { title: "Check-in", detail: null as string | null }, // TODO(vlasnik): samostalni / lično
  },
  apartments: {
    eyebrow: "Smeštaj",
    title: "Izaberite svoj apartman",
    upTo: "do {n} gostiju",
    from: "od",
    perNight: "/ noć",
    cta: "Pogledaj i rezerviši",
  },
  occasions: {
    eyebrow: "Posebne prilike",
    title: "Savršeno za...",
    items: [
      {
        title: "Romantičan vikend",
        text: "Dve noći daleko od svakodnevice, topla voda, mirno veče i samo vas dvoje.",
      },
      {
        title: "Godišnjica ili rođendan",
        text: "Proslavite datum koji vam je važan u prostoru koji je samo vaš.",
      },
      {
        title: "Iznenađenje za partnera",
        text: "Rezervišite, a mi ćemo vam pomoći da sve bude spremno kad stignete.",
      },
    ],
    note: "Šampanjac, latice ruža ili kasni check-out? Javite nam pri rezervaciji.",
  },
  gallery: {
    eyebrow: "Galerija",
    title: "Pogledajte apartman",
    open: "Otvori fotografiju {n} od {total}",
    close: "Zatvori galeriju",
    previous: "Prethodna fotografija",
    next: "Sledeća fotografija",
    counter: "{n} / {total}",
    placeholder: "Fotografija uskoro",
  },
  location: {
    eyebrow: "Lokacija",
    title: "Podbara, mirni deo Novog Sada",
    // TODO(vlasnik): potvrditi/proširiti tekst o lokaciji
    text: "Apartmani se nalaze na Podbari, u starom delu Novog Sada, blizu centra i Dunava.",
    nearbyTitle: "U blizini",
    // TODO(vlasnik): udaljenosti (npr. "5 min pešaka") i konkretni restorani/kafići
    nearby: [
      "Restorani i kafići",
      "Prodavnica 0–24",
      "Parking",
      "Dunavski kej",
      "Petrovaradinska tvrđava",
    ],
    mapTitle: "Mapa lokacije apartmana",
    mapSoon: "Mapa sa tačnom adresom uskoro",
    openMaps: "Otvori u Google Maps",
  },
  reviews: {
    eyebrow: "Utisci",
    title: "Šta kažu naši gosti",
    rating: "Ocena {n} od 5",
    bookingScore: "Ocena na Bookingu: {n}",
  },
  faq: {
    eyebrow: "Pitanja",
    title: "Česta pitanja",
    soon: "Odgovor uskoro. Do tada nas slobodno pitajte na WhatsApp.",
    // TODO(vlasnik): odgovori na sva pitanja
    items: [
      { q: "Kada je check-in, a kada check-out?", a: null as string | null },
      { q: "Da li postoji parking?", a: null as string | null },
      { q: "Kako se koristi đakuzi?", a: null as string | null },
      { q: "Da li su dozvoljeni kućni ljubimci?", a: null as string | null },
      { q: "Kako mogu da otkažem rezervaciju?", a: null as string | null },
      { q: "Kako se plaća?", a: null as string | null },
      { q: "Da li je potrebna kapara?", a: null as string | null },
    ],
  },
  finalCta: {
    title: "Rezervišite direktno, bez posrednika",
    text: "Najbolja cena je uvek kod nas. Izaberite datume ili nam se javite, odgovaramo brzo.",
    book: "Rezerviši",
    whatsapp: "Pišite nam na WhatsApp",
    imageAlt: "Apartman uveče, prigušeno svetlo i đakuzi",
  },
  footer: {
    text: "Apartmani sa privatnim đakuzijem na Podbari, za trenutke koje pamtite.",
    contactTitle: "Kontakt",
    linksTitle: "Sajt",
    apartmentsTitle: "Apartmani",
    soon: "Uskoro",
    madeBy: "Izrada: prWeb",
  },
  contact: {
    whatsappLabel: "Pišite nam na WhatsApp",
    whatsappMessage: "Zdravo, zanima me slobodan termin za apartman...",
  },
  apartment: {
    backHome: "Početna",
    upTo: "do {n} gostiju",
    about: "O apartmanu",
    amenities: "Sadržaji",
    amenityJacuzzi: "Privatni đakuzi",
    amenitiesSoon: "Kompletna lista sadržaja uskoro.",
    houseRules: "Kućni red",
    houseRulesSoon: "Kućni red uskoro.",
    checkInOut: "Dolazak i odlazak",
    checkInOutSoon: "Vreme dolaska i odlaska uskoro.",
    otherApartments: "Ostali apartmani",
  },
  booking: {
    title: "Rezervacija",
    from: "od",
    perNight: "/ noć",
    chooseDates: "Izaberi datume",
    previousMonth: "Prethodni mesec",
    nextMonth: "Sledeći mesec",
    weekdays: ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"],
    legendFree: "Slobodno",
    legendBooked: "Zauzeto",
    legendSelected: "Izabrano",
    nightsOne: "{n} noć",
    nightsFew: "{n} noći",
    selected: "{from} – {to}",
    submit: "Pošalji zahtev",
    previewNote:
      "Online rezervacija se uskoro uključuje. Do tada nam pišite na WhatsApp i proverićemo termin.",
    requestNote: "Vlasnik potvrđuje svaki zahtev, obično u toku dana.",
  },
  notFound: {
    title: "Stranica nije pronađena",
    text: "Stranica koju tražite ne postoji ili je premeštena.",
    back: "Nazad na početnu",
  },
};

export type Dictionary = typeof sr;
