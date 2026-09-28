-- Initial schema: apartments, per-day price overrides and reservations.
--
-- Date rules (see CLAUDE.md):
--   * calendar dates are `date`, never timestamp
--   * a night is named by the date it starts ("night of Oct 2" = Oct 2 → Oct 3)
--   * check_out is exclusive: [check_in, check_out), so 2 → 5 = nights of the 2nd, 3rd and 4th
--
-- RLS is enabled on every table WITHOUT any policy: the anon and authenticated
-- roles can neither read nor write anything. All access goes through the server
-- with the service_role key (lib/supabase/admin.ts), which bypasses RLS.

-- Lets the exclusion constraint below combine uuid equality with range overlap.
-- Supabase keeps extensions in their own schema, out of the public API.
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- apartments: adding an apartment = inserting a row, no code changes.
-- ---------------------------------------------------------------------------
create table public.apartments (
  id               uuid primary key default gen_random_uuid(),
  -- Used in URLs (/sr/apartmani/de-lux): lowercase letters, digits and single dashes.
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null,
  -- Base prices in whole euros per night.
  price_weekday    integer not null check (price_weekday > 0),  -- Sunday–Thursday nights
  price_friday     integer not null check (price_friday > 0),   -- Friday → Saturday
  price_saturday   integer not null check (price_saturday > 0), -- Saturday → Sunday
  max_guests       integer not null check (max_guests > 0),
  -- SECRET: never selected by public queries, never sent to the browser.
  -- For now the app still reads BOOKING_ICAL_URL_<SLUG> from env (lib/booking-ical.ts).
  booking_ical_url text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- price_overrides: one row = the price of ONE night (the night starting on `date`).
-- Setting a price for a range upserts one row per day; deleting the rows
-- restores the base price.
-- ---------------------------------------------------------------------------
create table public.price_overrides (
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  date         date not null,
  price        integer not null check (price > 0),
  primary key (apartment_id, date)
);

-- ---------------------------------------------------------------------------
-- reservations: website requests, manual (phone) reservations and owner blocks.
--   status  pending   = guest sent a request, waiting for the owner
--           confirmed = confirmed by the owner
--           cancelled = cancelled, the dates are free again
--           blocked   = owner closed the dates, no guest
--   source  website | admin
-- ---------------------------------------------------------------------------
create table public.reservations (
  id           uuid primary key default gen_random_uuid(),
  -- restrict: an apartment that has reservations cannot be deleted by accident.
  apartment_id uuid not null references public.apartments (id) on delete restrict,
  check_in     date not null,
  check_out    date not null, -- exclusive, same meaning as iCal DTEND
  guest_name   text,
  guest_email  text,
  guest_phone  text,
  guests       integer check (guests > 0),
  -- Whole euros, calculated by the server when the reservation is created.
  -- Later price changes never touch it.
  total_price  integer check (total_price >= 0),
  status       text not null default 'pending'
               check (status in ('pending', 'confirmed', 'cancelled', 'blocked')),
  source       text not null default 'website'
               check (source in ('website', 'admin')),
  created_at   timestamptz not null default now(),

  constraint reservations_dates_check check (check_out > check_in),

  -- A real reservation needs a guest name, a guest count and a price.
  -- Blocks have no guest, and a cancelled block keeps its empty guest fields.
  -- Email and phone stay optional here (phone guests); the website API requires both.
  constraint reservations_guest_check check (
    status in ('blocked', 'cancelled')
    or (guest_name is not null and guests is not null and total_price is not null)
  ),

  -- THE protection against double bookings from the website: two active
  -- reservations of the same apartment can never share a night.
  -- '[)' = check_out exclusive, so one guest's check-out day can be the next
  -- guest's check-in day. A violation is Postgres error 23P01 → HTTP 409.
  constraint reservations_no_overlap exclude using gist (
    apartment_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'blocked'))
);

create index reservations_apartment_check_in_idx
  on public.reservations (apartment_id, check_in);

-- ---------------------------------------------------------------------------
-- Row Level Security: ON everywhere, intentionally WITHOUT policies.
-- ---------------------------------------------------------------------------
alter table public.apartments      enable row level security;
alter table public.price_overrides enable row level security;
alter table public.reservations    enable row level security;
