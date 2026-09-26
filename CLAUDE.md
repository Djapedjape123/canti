# CLAUDE.md — Ćanti Apartmani (sajt sa rezervacijama)

## ⭐ PRIORITET BROJ 1

Klijentu je najvažnije da **sam, kroz admin panel, menja cenu noćenja za bilo koji dan**, bez mene.

To znači:
- U `/admin/kalendar` vidi svaki dan sa trenutnom cenom
- Klikne jedan dan ili označi raspon (npr. 31.12–2.1) → upiše cenu → sačuva
- Može da vrati dan na osnovnu cenu
- U `/admin/podesavanja` menja osnovne cene (radni dan / petak / subota)
- Promena se **odmah** vidi na javnom sajtu i u obračunu rezervacije
- Mora da radi **na telefonu**, jednostavno, bez uputstva

Ako moraš da biraš šta ide prvo ili šta se skraćuje zbog roka, ova funkcionalnost se **ne skraćuje**.

---

## Jezik i način rada

- Odgovaraj mi **na srpskom (latinica)**. Kod, imena fajlova, varijabli i commit poruke pišu se na engleskom.
- Kad pišeš ili menjaš fajl, pokaži mi **ceo fajl**, ne samo diff, osim kad je izmena jedna-dve linije.
- Kad napišeš **API rutu**, posle koda objasni je **red po red** (ili blok po blok). To mi je način da učim.
- **Pre nego što dodaš novu npm zavisnost**, pitaj me i objasni zašto je potrebna.
- **Ne menjaj šemu baze** bez novog fajla u `supabase/migrations/`. Nikad ne menjaj postojeću migraciju.
- Pre nego što kažeš da je nešto gotovo, pokreni `npm run lint`, `npm run typecheck` i `npm run test`. Ako nešto pada, popravi ili mi jasno reci šta pada.
- Ako nešto u ovom fajlu nije jasno ili se kosi sa onim što tražim, **pitaj** umesto da pogađaš.
- Radimo u malim koracima: jedna funkcionalnost → testiraj → sledeća.
- **Ne izmišljaj činjenice o apartmanu** (parking, udaljenost, sadržaji, recenzije). Gde podatak fali, stavi `TODO(vlasnik)` u `lib/content.ts` i reci mi.

---

## O projektu

Sajt za **Ćanti Apartmani**, apartmane sa đakuzijem na Podbari u Novom Sadu. Vlasnik trenutno izdaje preko Booking.com i telefonom/Instagramom, i vodi raspoloživost ručno.

**Cilj demoa (rok: ~6. oktobar 2026):** jedan apartman, **De Lux**, potpuno funkcionalan:
1. Gost vidi slobodne datume i tačnu cenu, i **pravi rezervaciju** direktno na sajtu
2. Zauzeti datumi dolaze iz **Booking.com iCal exporta** + iz **naših rezervacija**
3. Rezervacije sa sajta idu nazad na Booking preko **našeg iCal exporta** (vlasnik ga nalepi u Booking → Sync calendars → Import)
4. Vlasnik kroz **admin panel** menja cene po danu, blokira datume i potvrđuje/otkazuje rezervacije
5. **Lepa, brza početna strana** koja deluje kao premium smeštaj, ne kao oglas

Kasnije se dodaju ostala 4 apartmana (ukupno 5). Kod piši tako da je dodavanje apartmana **samo novi red u bazi**, bez izmena koda. Ništa ne sme biti hardkodovano za De Lux.

---

## Stack

- **Next.js** (App Router) + **TypeScript** (strict)
- **Tailwind CSS**
- **Supabase**: Postgres baza + Auth (samo za admina)
- **node-ical**: parsiranje Booking iCal feeda
- **Resend**: mejlovi (vlasniku i gostu)
- **zod**: validacija svih ulaza u API rute
- **vitest**: testovi za logiku cena i iCal
- **Vercel**: hosting

Proveri verziju Next.js u `package.json`. U Next.js 16+ se `middleware.ts` zove `proxy.ts`, pa koristi ono što odgovara instaliranoj verziji.
Proveri i verziju Tailwinda. U v4 tokeni idu u `@theme` u `app/globals.css`, a u v3 u `tailwind.config.ts`.

---

## Arhitektura

```
Booking.com ──(iCal export, naš uvoz)──► /lib/booking-ical.ts ──┐
                                                                 ├─► zauzeti datumi ─► javni kalendar
Supabase: reservations (pending/confirmed/blocked) ─────────────┘

Supabase: reservations ──► /api/ical/[slug] ──(vlasnik nalepi u Booking Import)──► Booking.com
```

### Zlatna pravila sinhronizacije

1. **Zauzeto = Booking iCal ∪ naše rezervacije** sa statusom `pending`, `confirmed` ili `blocked`.
2. **Naš iCal export sadrži SAMO naše rezervacije** (iz tabele `reservations`). **Nikada** ne izvozimo datume koji su došli sa Bookinga, jer bi to napravilo petlju.
3. Booking ne čita naš kalendar u realnom vremenu, pa **uvek postoji mali prozor za duplu rezervaciju**. Ne pokušavaj da ga "rešiš" komplikovanim kodom. To je poznato ograničenje iCal-a i klijent zna za njega.

---

## Pravila za datume (NAJVAŽNIJI DEO — ovde nastaju bagovi)

- Datumi se čuvaju i šalju kao string **`'YYYY-MM-DD'`** i u bazi kao tip **`date`**, nikad `timestamp`.
- **`check_out` je ekskluzivan**: gost koji dolazi 2. i odlazi 5. spava noći **2, 3 i 4**. Dan 5 je slobodan za sledećeg gosta.
- **Noć se označava datumom kad počinje.** "Noć 2. okt" = sa 2. na 3. okt.
- iCal `DTEND` je takođe ekskluzivan, isto kao `check_out`. Ne dodaji i ne oduzimaj dan pri konverziji.
- Booking koristi `DTSTART;VALUE=DATE:20261002` (datum bez vremena). **node-ical takve datume pretvara u JS `Date` u lokalnoj zoni**, a to na Vercelu (UTC) i lokalno (Europe/Belgrade) može da da **različit dan**. Uvek iz `Date` objekta izvuci datum pažljivo i **pokrij to testom** sa pravim primerom iz `fixtures/`.
- Sva aritmetika sa datumima ide kroz helpere u `lib/dates.ts` (UTC, `T00:00:00Z`). Nigde u kodu ne radi `new Date()` sa lokalnom zonom za kalendarske datume.
- "Danas" se računa u zoni **`Europe/Belgrade`**. Gost ne može da rezerviše datum pre današnjeg.
- Rezervacija: minimum **1 noć**, maksimum **30 noći**.

---

## Cene

Svaki apartman ima tri osnovne cene (EUR, po noći):

| Noć | Kolona | De Lux |
|---|---|---|
| nedelja–četvrtak | `price_weekday` | 65 € |
| petak (petak→subota) | `price_friday` | 75 € |
| subota (subota→nedelja) | `price_saturday` | 79 € |

**Redosled pravila za svaku noć:**
1. Ako postoji red u `price_overrides` za taj apartman i datum → ta cena
2. Inače, ako je petak → `price_friday`
3. Inače, ako je subota → `price_saturday`
4. Inače → `price_weekday`

- **Cenu uvek računa server.** Klijent šalje samo `slug`, `check_in`, `check_out`. Cena koju pošalje browser se ignoriše.
- `total_price` se upisuje u rezervaciju u trenutku kreiranja. Kasnija promena cena ne menja postojeće rezervacije.
- Prikaz: `65 €`, format `sr-RS` (`new Intl.NumberFormat('sr-RS', { style: 'currency', currency: 'EUR' })`).
- "Od X € / noć" na karticama = najmanja od tri osnovne cene tog apartmana.
- Logika je u `lib/pricing.ts` i **mora imati testove** (preko vikenda, override usred boravka, jedna noć, prelaz meseca, prelaz na zimsko vreme krajem oktobra).

---

## Baza (Supabase)

Pun SQL je u `supabase/migrations/`. Pregled:

### `apartments`
`id` uuid, `slug` (unique, npr. `de-lux`), `name`, `price_weekday`, `price_friday`, `price_saturday`, `max_guests`, `booking_ical_url` (**tajno**)

### `price_overrides`
`apartment_id`, `date`, `price`. PK je `(apartment_id, date)`, pa za upis koristi **upsert**.

### `reservations`
`id`, `apartment_id`, `check_in`, `check_out`, `guest_name`, `guest_email`, `guest_phone`, `guests`, `total_price`, `status`, `source`, `created_at`

- `status`: `pending` (gost poslao, čeka vlasnika) | `confirmed` | `cancelled` | `blocked` (vlasnik ručno zatvorio datume, bez gosta)
- `source`: `website` | `admin`
- **`EXCLUDE` constraint** (btree_gist + `daterange(check_in, check_out)`) sprečava dve aktivne rezervacije koje se preklapaju. **To je glavna zaštita od duplih rezervacija sa sajta. Ne uklanjaj je.**
- Kad insert padne zbog constrainta (Postgres greška `23P01`), vrati gostu 409 i poruku: *"Nažalost, ovaj termin je upravo zauzet. Izaberite druge datume."*

### RLS
RLS je **uključen na svim tabelama, bez ijedne policy**. To znači da `anon` ključ ne može ništa. Sav pristup bazi ide **samo sa servera**, preko `service_role` ključa (`lib/supabase/admin.ts`). API rute same odlučuju šta smeju da vrate.

---

## Bezbednost

- `SUPABASE_SERVICE_ROLE_KEY` i `booking_ical_url` **nikada** ne idu u browser. Nikad `NEXT_PUBLIC_` prefiks za njih. Fajlove koji ih koriste označi sa `import 'server-only'`.
- Javne API rute vraćaju **samo**: listu zauzetih datuma (bez razloga/izvora), cene po noći, i potvrdu rezervacije. **Nikad** imena, telefone ili mejlove gostiju, niti Booking link.
- Svaki ulaz u API rutu prolazi kroz **zod** šemu.
- `/admin/*` i `/api/admin/*` su zaštićeni: middleware/proxy proverava Supabase sesiju, **i** svaka admin API ruta ponovo proverava korisnika (ne oslanjaj se samo na middleware).
- Postoji **samo jedan admin nalog** (vlasnik). Registracija je isključena u Supabase Auth podešavanjima, a nalog se kreira ručno u dashboardu.
- Naš iCal export je na `/api/ical/[slug]?token=...`. Token je u env (`ICAL_EXPORT_TOKEN`) i proverava se, kako niko ne bi mogao da pogodi URL i vidi raspored.
- Rate limit na `/api/reservations` (jednostavan, po IP-u) protiv spam rezervacija.
- `.env.local` je u `.gitignore`. `fixtures/*.ics` sa pravim podacima takođe.

---

## Booking iCal uvoz (`lib/booking-ical.ts`)

- `fetch` sa **timeoutom od 10 s** i `User-Agent` headerom.
- Keš **10 minuta** po apartmanu (Next.js `fetch` sa `next: { revalidate: 600 }` ili `unstable_cache`).
- Svaki `VEVENT` → raspon `[DTSTART, DTEND)` → lista zauzetih noći. Ignoriši sve osim `VEVENT`.
- **Pri kreiranju rezervacije** Booking se čita **bez keša** (`cache: 'no-store'`), pa se proveri preklapanje neposredno pre upisa.
- **Ako Booking fetch ne uspe:**
  - za prikaz kalendara → vrati poslednji keš ako postoji, inače grešku (UI prikazuje "Kalendar trenutno nije dostupan, kontaktirajte nas")
  - za kreiranje rezervacije → **odbij rezervaciju** (503) sa porukom da pokuša ponovo ili pozove. Nikad ne prihvataj rezervaciju ako nismo proverili Booking.
- Primer pravog exporta je u `fixtures/booking-sample.ics` (ne ide na git). Parser se testira na njemu.

## Naš iCal export (`/api/ical/[slug]`)

- Format po RFC 5545: `\r\n` na kraju linija, `VERSION:2.0`, `PRODID:-//Canti Apartmani//Booking Sync//SR`, `CALSCALE:GREGORIAN`
- Jedan `VEVENT` po rezervaciji sa statusom `pending`, `confirmed` ili `blocked`
- `DTSTART;VALUE=DATE:YYYYMMDD` i `DTEND;VALUE=DATE:YYYYMMDD` (= `check_out`)
- `UID:<reservation.id>@canti-apartmani`, **stabilan**, isti pri svakom izvozu
- `DTSTAMP` u UTC
- `SUMMARY:Rezervisano`. **Nikad ime gosta ni kontakt.**
- Samo buduće i tekuće rezervacije (`check_out >= danas`)
- `Content-Type: text/calendar; charset=utf-8`, bez keširanja (`Cache-Control: no-store`)
- Proveri ga pretplatom u Google Calendar pre nego što ga vlasnik nalepi u Booking.

---

## Tok rezervacije (`POST /api/reservations`)

1. zod validacija: `slug`, `check_in`, `check_out`, `guest_name`, `guest_email`, `guest_phone`, `guests`
2. Proveri: apartman postoji, datumi validni, `check_in >= danas`, 1–30 noći, `guests <= max_guests`
3. Povuci Booking iCal **bez keša** → ako se preklapa → 409
4. Izračunaj cenu na serveru (`lib/pricing.ts`)
5. Insert u `reservations` sa `status = 'pending'`, `source = 'website'` → ako `23P01` → 409
6. Pošalji mejlove preko Resend-a (vlasniku: detalji + link na `/admin/rezervacije`; gostu: "zahtev primljen, javljamo se uskoro"). **Ako mejl ne uspe, rezervacija ostaje**, samo loguj grešku.
7. Vrati `201` sa `id`, datumima, brojem noći i ukupnom cenom

Datum je zauzet čim rezervacija uđe kao `pending`. Vlasnik u adminu klikne **Potvrdi** (→ `confirmed`, mejl gostu) ili **Otkaži** (→ `cancelled`, datum se oslobađa, mejl gostu).

---

## API rute (ugovor)

### Javne
| Ruta | Metod | Vraća |
|---|---|---|
| `/api/availability/[slug]?from=YYYY-MM-DD&to=YYYY-MM-DD` | GET | `{ blocked: string[], prices: Record<string, number> }` (maks. 12 meseci raspon) |
| `/api/quote` | POST | `{ nights: {date, price}[], nightsCount, total }` |
| `/api/reservations` | POST | `201 { id, check_in, check_out, nightsCount, total }` / `409` / `422` / `503` |
| `/api/ical/[slug]?token=` | GET | `.ics` fajl |

### Admin (zahtevaju login)
| Ruta | Metod | Šta radi |
|---|---|---|
| `/api/admin/prices` | PUT | Postavi cenu za raspon: `{ slug, from, to, price }` (upsert) |
| `/api/admin/prices` | DELETE | Vrati na osnovnu cenu za raspon: `{ slug, from, to }` |
| `/api/admin/apartments/[slug]` | PATCH | Promeni `price_weekday` / `price_friday` / `price_saturday` |
| `/api/admin/reservations` | GET | Lista (filter po statusu, buduće prvo) |
| `/api/admin/reservations` | POST | Ručna rezervacija ili blokada (`source = 'admin'`) |
| `/api/admin/reservations/[id]` | PATCH | `{ status: 'confirmed' \| 'cancelled' }` |

---

## Admin panel (`/admin`)

- `/admin/login`: mejl + lozinka (Supabase Auth)
- `/admin`: pregled, sledeći dolasci, rezervacije na čekanju (istaknute)
- `/admin/kalendar`: mesečni prikaz po apartmanu. Svaki dan prikazuje **cenu** i **boju statusa**:
  - slobodno (belo) · Booking (plavo) · sajt pending (žuto) · sajt confirmed (zeleno) · blokirano (sivo)
  - Override cene vidljivo označen (npr. zlatna tačka ili podebljano)
  - Klik ili prevlačenje = izbor raspona → panel: **Postavi cenu** / **Vrati osnovnu** / **Blokiraj** / **Odblokiraj**
  - Na telefonu: panel se otvara odozdo (bottom sheet), polje za cenu je `inputMode="numeric"`, dugmad velika (min 44px)
- `/admin/rezervacije`: lista sa Potvrdi/Otkaži, plus dugme **+ Ručna rezervacija** (telefonski gosti)
- `/admin/podesavanja`: osnovne cene (radni dan / petak / subota)
- Mora da radi **na telefonu**, jer će ga vlasnik najčešće koristiti tako.
- Admin koristi iste boje brenda, ali jednostavnije: krem pozadina, petrolej zaglavlje, bez animacija.

---

## Dizajn sistem

Sajt je **vizuelni nastavak PDF predloga** koji je vlasnik već video: tamna petrolej zelena + zlatna + krem. Osećaj je **"tihi luksuz"**: romantično, mirno, večernje, sa puno prostora. Ne sme da liči na šarenu turističku agenciju ni na generički template.

### Boje (tokeni)

| Token | Hex | Upotreba |
|---|---|---|
| `brand-900` | `#0F2E2E` | najtamnija pozadina (footer, hero overlay) |
| `brand-800` | `#143B3B` | glavna tamna boja: header na skrolu, sekcije, dugmad |
| `brand-700` | `#1E4D4C` | hover na tamnim elementima |
| `gold-500` | `#C8A56A` | akcenat: logo, linije, ikonice, primarno dugme na tamnoj pozadini |
| `gold-600` | `#B08D52` | hover zlatnog |
| `cream-50` | `#FAF7F2` | glavna svetla pozadina |
| `cream-100` | `#F3EDE3` | naizmenične sekcije, kartice |
| `sand-200` | `#E6DCCB` | ivice, razdelnici |
| `ink-900` | `#1C2626` | tekst na svetloj pozadini |
| `ink-600` | `#55605F` | sekundarni tekst |

**Kontrast:** zlatna na krem pozadini **ne prolazi** za običan tekst. Zlatnu koristi samo za akcente, velike naslove (≥ 24px) ili na tamnoj petrolej pozadini. Tekst na svetloj pozadini je uvek `ink-900` / `ink-600`.

### Tipografija

- **Naslovi:** serif, elegantan: `Cormorant Garamond` (600/700) ili `Playfair Display`, preko `next/font/google`
- **Tekst i UI:** `Manrope` ili `Inter` (400/500/600)
- **Obavezno `subsets: ['latin', 'latin-ext']`**, jer bez `latin-ext` slova **Ć, č, đ, š, ž** padaju na drugi font. Proveri "ĆANTI" i "đakuzi" vizuelno.
- Skala: hero naslov `clamp(2.5rem, 6vw, 4.5rem)`, H2 `clamp(1.875rem, 4vw, 3rem)`, tekst 16–18px, `leading-relaxed`
- Mali natpisi iznad naslova (eyebrow): uppercase, `tracking-[0.2em]`, 12–13px, zlatna na tamnom / `ink-600` na svetlom

### Oblici i detalji

- Zaobljenja umerena: `rounded-xl` za kartice, `rounded-full` za dugmad
- Tanke zlatne linije (1px, širine ~64px) kao ukras ispod eyebrow-a, kao u PDF-u
- Senke meke i retke (`shadow-sm` / `shadow-lg` samo na hover kartice)
- Kontejner: `max-w-7xl`, horizontalni padding `px-5 md:px-8`, vertikalni razmak sekcija `py-20 md:py-28`

### Dugmad

- **Primarno:** `bg-gold-500 text-brand-900` na tamnoj pozadini, `bg-brand-800 text-cream-50` na svetloj
- **Sekundarno:** okvir 1px, providna pozadina
- Uvek vidljiv `focus-visible` prsten (zlatni)

### Pokret

- Suptilno: fade + pomeranje 16px na ulasku u ekran (IntersectionObserver ili CSS `@starting-style`), 500–700ms, `ease-out`
- Hero slika: vrlo blag zoom (1.05 → 1) pri učitavanju
- **Poštuj `prefers-reduced-motion`**: tada bez animacija
- **Bez** teških animacionih biblioteka za demo (pitaj pre nego što dodaš framer-motion)

---

## Početna strana (`/`) — sekcije redom

Sav tekst je u `lib/content.ts`. Gde podatak nije potvrđen, stoji `TODO(vlasnik)` i sekcija i dalje lepo izgleda sa placeholderom.

### 1. Header (sticky)
- Levo: logotip **ĆANTI** (serif, zlatna, `tracking-wide`) + mali natpis "Apartmani sa đakuzijem"
- Sredina/desno: Apartmani · Lokacija · Utisci · Pitanja · Kontakt (anchor linkovi, glatki skrol)
- Desno: dugme **Rezerviši**
- Preko hero-a je providan sa belim tekstom, a posle skrola dobija `bg-brand-800/95` + `backdrop-blur`
- Mobilni: hamburger → meni preko celog ekrana (petrolej pozadina, veliki serif linkovi)

### 2. Hero (ceo ekran, `min-h-[100svh]`)
- Pozadina: najlepša večernja slika đakuzija/apartmana (`next/image`, `priority`, `sizes="100vw"`), sa gradijentom `from-brand-900/80 via-brand-900/40 to-transparent` odozdo, da tekst bude čitljiv
- Eyebrow: "NOVI SAD · PODBARA"
- Naslov (serif): **"Vaš privatni đakuzi u srcu Novog Sada"**
- Podnaslov: "Apartmani za romantične vikende, proslave i trenutke samo za vas dvoje."
- **Widget za pretragu** (kartica, krem na desktopu, preko slike): Datum dolaska · Datum odlaska · Broj gostiju · dugme **Proveri dostupnost**. Za demo vodi na `/apartmani/de-lux?checkIn=…&checkOut=…&guests=…`, gde je kalendar već popunjen tim datumima. Kad bude više apartmana, vodi na listu slobodnih.
- Ispod widgeta sitno: "Direktna rezervacija · bez posrednika · od **65 €** / noć" (cena se čita iz baze, ne hardkoduje)
- Na mobilnom: widget ispod teksta, puna širina

### 3. Traka prednosti (odmah ispod hero-a)
4 stavke, ikonica (tanka linija, zlatna) + kratak tekst, na `cream-100`:
- Privatni đakuzi u apartmanu
- Podbara: `TODO(vlasnik)` minuta pešaka do centra
- `TODO(vlasnik)` parking
- `TODO(vlasnik)` check-in (samostalni / lično)

### 4. Apartmani
- Eyebrow "SMEŠTAJ", naslov "Izaberite svoj apartman"
- Grid kartica (1 kolona mobilni, 2 tablet, 3 desktop), podaci **iz baze**
- Kartica: slika (aspect 4/3, blagi zoom na hover), naziv (serif), "do X gostiju", kratak opis, **"od X € / noć"**, link "Pogledaj i rezerviši →"
- U demou je samo De Lux. Tada kartica ide šire i horizontalno (slika levo, tekst desno), da jedna kartica ne izgleda usamljeno.

### 5. Za posebne trenutke
- Tamna sekcija (`brand-800`), naslov "Savršeno za..."
- 3 kartice: **Romantičan vikend** · **Godišnjica ili rođendan** · **Iznenađenje za partnera**
- Svaka ima kratak tekst i sliku ili ikonicu
- Na dnu sitno: "Šampanjac, latice ruža ili kasni check-out? Javite nam pri rezervaciji." (priprema za upsell iz Premium paketa, za sada samo tekst)

### 6. Galerija
- Naslov "Pogledajte apartman"
- Asimetrična mreža (jedna velika + 4 manje na desktopu, horizontalni skrol sa snap-om na mobilnom)
- Klik → lightbox (tastatura: ←, →, Esc; swipe na telefonu). Napravi ga sam, bez biblioteke, ili pitaj.
- Sve slike preko `next/image`, `alt` opisi na srpskom

### 7. Lokacija i lokalni vodič
- Levo: tekst o Podbari + lista u blizini (restorani, kafići, prodavnica 0–24, parking, Petrovaradinska tvrđava, Dunavski kej), sve `TODO(vlasnik)`
- Desno: mapa. Google Maps `iframe` sa `loading="lazy"`, u zaobljenom okviru. Tačna adresa je `TODO(vlasnik)`.
- Dugme "Otvori u Google Maps"

### 8. Utisci gostiju (zid poverenja)
- 3 kartice: citat (serif, italic), ime + izvor (Booking / Google), zvezdice, i ocena sa Bookinga ako je vlasnik da
- **Samo prave recenzije koje vlasnik odobri. Nikad izmišljene.** Dok ih nema, sekcija se **ne prikazuje** (uslovni render), ne placeholder tekst.

### 9. Česta pitanja (FAQ)
- Harmonika sa nativnim `<details>/<summary>` (pristupačno, radi bez JS-a), zlatni + / − indikator
- Pitanja: vreme check-in/check-out · parking · kako se koristi đakuzi · da li su dozvoljeni kućni ljubimci · otkazivanje · kako se plaća · da li je potrebna kapara. Odgovori su `TODO(vlasnik)`.
- Uz to **JSON-LD `FAQPage`** (bitno za SEO i AI pretragu)

### 10. Završni poziv
- Puna širina, slika u pozadini sa tamnim overlay-em
- Naslov "Rezervišite direktno, bez posrednika"
- Dva dugmeta: **Rezerviši** (primarno) · **Pišite nam na WhatsApp** (sekundarno)

### 11. Footer (`brand-900`)
- Logo, kratka rečenica, adresa, telefon, mejl, Instagram (sve `TODO(vlasnik)`)
- Linkovi na sekcije
- Sitno: "© 2026 Ćanti Apartmani" · "Izrada: prWeb"

### Plutajuće dugme
- WhatsApp/Viber dugme dole desno (mobilni i desktop), zlatni krug sa ikonicom
- Otvara `https://wa.me/<broj>?text=` sa gotovom porukom: "Zdravo, zanima me slobodan termin za apartman..."
- Broj je `TODO(vlasnik)` u env ili `content.ts`
- Na stranici apartmana ne sme da prekriva sticky traku za rezervaciju

---

## Stranica apartmana (`/apartmani/[slug]`)

- Galerija na vrhu (ista komponenta kao na početnoj)
- Levo (desktop): naziv, "do X gostiju", opis, sadržaji (ikonice), kućni red, check-in/out
- Desno (desktop): **sticky kartica za rezervaciju**: kalendar, gosti, pregled cene, dugme
- Mobilni: kartica za rezervaciju ide ispod opisa, plus **sticky donja traka** "od 65 € / noć · **Izaberi datume**" koja skroluje do kalendara
- Kalendar:
  - Zauzeti dani precrtani/sivi i nedostupni za klik
  - Cena ispisana sitno ispod broja dana (desktop), a na mobilnom samo na izabranim danima
  - Dan odlaska drugog gosta mora biti dostupan kao **dan dolaska** (zbog ekskluzivnog `check_out`)
  - Izabrani raspon: `brand-800` krajevi, `cream-100` sredina
- Ispod kalendara: "3 noći · 219 €" sa raščlanjivanjem po noćima (petak 75 €, subota 79 €, nedelja 65 €)
- Posle rezervacije: jasna poruka da je **zahtev poslat i da vlasnik potvrđuje**, a ne "rezervacija potvrđena"

---

## Kvalitet

- **Mobile-first.** Većina gostiju dolazi sa Instagrama i telefona. Testiraj na 375px širine.
- Lighthouse mobilni: Performance ≥ 90, Accessibility ≥ 95, SEO 100
- LCP < 2.5 s: hero slika `priority`, komprimovana, bez teških fontova i biblioteka
- Pristupačnost: semantički HTML (`header`, `main`, `section` sa `aria-labelledby`, `footer`), vidljiv fokus, `alt` na svim slikama, kalendar radi i tastaturom
- SEO:
  - `metadata` na svakoj stranici (`title`, `description`, Open Graph slika)
  - Ključne fraze: "apartman sa đakuzijem Novi Sad", "romantičan vikend Novi Sad", "apartman Podbara"
  - JSON-LD: `LodgingBusiness` na početnoj (ime, adresa, cena od, slike), `FAQPage` uz FAQ
  - `sitemap.ts` i `robots.ts` (`/admin` je `noindex` i isključen iz sitemap-a)
- `<html lang="sr-Latn">`

---

## Van obima demoa (NE pravi dok ne kažem)

Ovo je iz paketa u predlogu i dolazi posle demoa: AI asistent, kviz "Koji apartman je pravi za Vas", prekidač srpski/engleski, vremenska prognoza, generator poklon vaučera, mid-week tajmer za popuste, upsell dodaci pri rezervaciji (kao checkbox sa cenom), generator linka za kaparu, "trenutno gledano" indikator, sezonski baner, automatski mejl podsetnik, QR check-in vodič, mesečni izveštaj, "uporedi apartmane" prekidač, Google kalendar kao izvor.

Kod ipak piši tako da se ovo kasnije lako doda: tekstovi na jednom mestu (za prevod), komponente sekcija nezavisne jedna od druge.

---

## Struktura

```
app/
  layout.tsx          # fontovi, <html lang="sr-Latn">, metadata
  globals.css         # Tailwind + tokeni boja
  page.tsx            # početna, samo slaže sekcije
  apartmani/[slug]/page.tsx
  sitemap.ts
  robots.ts
  admin/
    layout.tsx
    login/page.tsx
    page.tsx
    kalendar/page.tsx
    rezervacije/page.tsx
    podesavanja/page.tsx
  api/
    availability/[slug]/route.ts
    quote/route.ts
    reservations/route.ts
    ical/[slug]/route.ts
    admin/
      prices/route.ts
      apartments/[slug]/route.ts
      reservations/route.ts
      reservations/[id]/route.ts
components/
  layout/             # Header, Footer, MobileMenu, FloatingContact
  home/               # Hero, SearchWidget, Highlights, ApartmentsSection,
                      # Occasions, Gallery, Location, Reviews, Faq, FinalCta
  booking/            # BookingCalendar, PriceBreakdown, ReservationForm, StickyBookingBar
  admin/              # AdminCalendar, PriceEditorSheet, ReservationList
  ui/                 # Button, Container, SectionHeading, Lightbox, Reveal
lib/
  content.ts          # svi tekstovi sajta + TODO(vlasnik)
  dates.ts            # sva aritmetika sa datumima (UTC)
  pricing.ts          # logika cena
  booking-ical.ts     # uvoz Booking iCal-a (server-only)
  ical-export.ts      # generisanje našeg .ics
  availability.ts     # spaja Booking + naše rezervacije
  email.ts            # Resend
  validation.ts       # zod šeme
  jsonld.ts           # LodgingBusiness, FAQPage
  supabase/
    admin.ts          # service_role klijent (server-only)
    server.ts         # klijent sa sesijom (za admin auth)
    browser.ts        # klijent za login stranicu
public/
  images/             # slike apartmana (od vlasnika)
supabase/
  migrations/
fixtures/
  booking-sample.ics  # NE ide na git
tests/
  pricing.test.ts
  dates.test.ts
  booking-ical.test.ts
  ical-export.test.ts
```

---

## Env varijable

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=
OWNER_EMAIL=
ICAL_EXPORT_TOKEN=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_WHATSAPP_NUMBER=
```

Napravi i `.env.example` sa istim ključevima, bez vrednosti.

## Komande

```
npm run dev
npm run build
npm run lint
npm run typecheck     # tsc --noEmit
npm run test          # vitest run
```

---

## Konvencije koda

- TypeScript strict, **bez `any`**
- Server Components po defaultu. `'use client'` samo gde treba interakcija (kalendar, forme, meni, lightbox, animacije na skrol).
- Male, jasne funkcije. Poslovna logika (cene, datumi, iCal) je u `lib/` kao **čiste funkcije** koje se lako testiraju, ne u komponentama ni rutama.
- API rute: validacija → logika iz `lib/` → odgovor. Greške uvek kao `{ error: string }` sa odgovarajućim statusom. Poruke za gosta su na srpskom.
- Boje samo preko tokena (`bg-brand-800`), nikad hex direktno u komponentama.
- Ne loguj lične podatke gostiju ni Booking URL.
- Komentari u kodu samo gde nešto nije očigledno (posebno oko datuma i ekskluzivnog `check_out`).

---

## Plan (demo za 10 dana)

- [ ] **Dan 1:** projekat, Tailwind + tokeni boja + fontovi, Supabase, migracija, seed De Lux, `.env.example`, prvi deploy na Vercel
- [ ] **Dan 2:** `lib/dates.ts`, `lib/booking-ical.ts` + testovi na `fixtures/booking-sample.ics`, `/api/availability/[slug]`
- [ ] **Dan 3:** `lib/pricing.ts` + testovi, `/api/quote`
- [ ] **Dan 4:** javni kalendar (izbor raspona, zauzeti dani, cena po noći, ukupno)
- [ ] **Dan 5:** forma + `/api/reservations` + Resend mejlovi
- [ ] **Dan 6:** admin login, zaštita ruta, lista rezervacija (Potvrdi/Otkaži)
- [ ] **Dan 7:** ⭐ admin kalendar (cene po danu, blokiranje), podešavanja osnovnih cena
- [ ] **Dan 8:** `/api/ical/[slug]` export + test u Google Calendar → poslati link vlasniku za Booking Import
- [ ] **Dan 9:** početna strana (sve sekcije), stranica apartmana, mobilni prikaz, SEO, JSON-LD
- [ ] **Dan 10:** test od početka do kraja, Lighthouse, popravke, priprema demoa

Ako Dan 9 kasni, redosled sekcija za skraćivanje (poslednje otpada prvo): Utisci → Za posebne trenutke → Lokacija. Hero, Apartmani, Galerija, FAQ i Footer **ostaju**.

### Test scenario pre demoa
1. Zatvoriti datum na Bookingu → posle ≤10 min zauzet na sajtu
2. Rezervacija na sajtu → datum zauzet, mejlovi stigli, vidi se u adminu kao pending
3. Pokušaj iste rezervacije ponovo → 409
4. Admin promeni cenu za petak → nova cena na sajtu i u ukupnom iznosu
5. Admin blokira dan → zauzet na sajtu i pojavljuje se u našem .ics
6. Naš .ics u Booking Import → posle nekog vremena datum zatvoren na Bookingu
7. Otkazivanje u adminu → datum ponovo slobodan
8. Početna na telefonu (375px): hero čitljiv, widget radi, WhatsApp dugme otvara poruku, ništa ne izlazi van ekrana

---

## Otvorena pitanja (pitaj me pre nego što odlučiš sam)

- `max_guests` za De Lux (trenutno pretpostavka: 2)
- Check-in / check-out vreme, kućni red, parking, udaljenost do centra
- Tačna adresa (za mapu i JSON-LD)
- Broj za WhatsApp/Viber, Instagram nalog
- Slike apartmana (iste kao na Bookingu, uz dozvolu vlasnika) i koje su recenzije OK da se prikažu
- Minimalan broj noći (npr. vikendom min 2)? Za sada **nema**.
- Da li vlasnik hoće kaparu kasnije (tada se dodaje `awaiting_payment` status)
- Domen i adresa pošiljaoca mejlova (Resend zahteva verifikovan domen za produkciju)

## Poznata ograničenja (klijent zna)

- Sinhronizacija sa Bookingom **nije u realnom vremenu**. Moguća je dupla rezervacija u kratkom prozoru. Pravo rešenje je channel manager (Rentlio, Beds24), kao buduća nadogradnja.
- Bez kapare, rezervacija je "zahtev" dok je vlasnik ne potvrdi.