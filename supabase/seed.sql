-- Demo data: only the De Lux apartment.
-- Safe to run more than once: an existing row with the same slug is left untouched.
insert into public.apartments
  (slug, name, price_weekday, price_friday, price_saturday, max_guests, sort_order)
values
  ('de-lux', 'De Lux', 65, 75, 79, 3, 1)
on conflict (slug) do nothing;
