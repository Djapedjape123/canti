-- Unblocking dates from the admin calendar (DELETE /api/admin/blocks).
--
-- The owner may free only PART of a block: block 10–15 Oct, unblock the 12th
-- → the blocks 10–11 and 13–15 remain. That takes up to two statements
-- (shrink the block, add the part on the right). They run inside this one
-- function, which is one transaction: the nights are never free for a moment,
-- so a website request cannot slip in between.
--
-- Only rows with status 'blocked' are touched. Guests (pending, confirmed)
-- stay as they are, and Booking.com dates are not in this table at all.
--
-- p_to is EXCLUSIVE, like check_out: unblock_nights(id, '2026-10-12', '2026-10-13')
-- frees the night of 12 Oct. Returns how many nights were freed.

create or replace function public.unblock_nights(p_apartment_id uuid, p_from date, p_to date)
returns integer
language plpgsql
security invoker
-- Empty search path: every table is written as public.<name>, nothing else can be picked up.
set search_path = ''
as $$
declare
  blocked_row record;
  freed integer := 0;
begin
  if p_to <= p_from then
    return 0;
  end if;

  -- for update: locks these blocks until the transaction ends, so two unblocks
  -- at the same moment cannot cut the same block twice.
  for blocked_row in
    select id, check_in, check_out, source
    from public.reservations
    where apartment_id = p_apartment_id
      and status = 'blocked'
      and check_in < p_to
      and check_out > p_from
    for update
  loop
    -- Nights of this block inside [p_from, p_to). date - date is a number of days.
    freed := freed + (least(blocked_row.check_out, p_to) - greatest(blocked_row.check_in, p_from));

    if blocked_row.check_in >= p_from and blocked_row.check_out <= p_to then
      -- The whole block is inside the selection. A block has no guest, nothing to keep.
      delete from public.reservations where id = blocked_row.id;

    elsif blocked_row.check_in < p_from and blocked_row.check_out > p_to then
      -- The selection is in the middle: keep the left part, add the right part.
      -- Shrinking first frees exactly the selected nights, so the new row overlaps nothing.
      update public.reservations set check_out = p_from where id = blocked_row.id;
      insert into public.reservations (apartment_id, check_in, check_out, status, source)
      values (p_apartment_id, p_to, blocked_row.check_out, 'blocked', blocked_row.source);

    elsif blocked_row.check_in < p_from then
      -- Starts before the selection: keep only the nights before it.
      update public.reservations set check_out = p_from where id = blocked_row.id;

    else
      -- Ends after the selection: keep only the nights after it.
      update public.reservations set check_in = p_to where id = blocked_row.id;
    end if;
  end loop;

  return freed;
end;
$$;

-- Only the server (service_role) may call it. Supabase lets anon and
-- authenticated execute new functions by default, so that is taken away:
-- they cannot touch the tables either (RLS without policies).
revoke execute on function public.unblock_nights(uuid, date, date) from public, anon, authenticated;
grant execute on function public.unblock_nights(uuid, date, date) to service_role;
