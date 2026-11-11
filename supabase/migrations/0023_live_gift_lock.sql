-- Stops gift credit being overspent.
--
-- send_live_gift() checked the balance and then spent it with nothing in
-- between to stop a second call doing the same. Two gifts sent at the same
-- moment (two tabs, a double tap) could both pass the check and push the
-- sender's credit below zero, while the creator was paid for both.
--
-- The function now takes a per-sender transaction lock before reading the
-- balance, so one sender's gifts are processed one at a time. Different
-- senders never wait on each other. Everything else is unchanged.

create or replace function public.send_live_gift(p_stream_id uuid, p_gift_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_gift public.live_gifts;
  v_stream public.live_streams;
  v_balance numeric;
  v_send_id bigint;
begin
  if v_sender is null then
    raise exception 'sign in required';
  end if;

  select * into v_gift from public.live_gifts where id = p_gift_id and active;
  if not found then
    raise exception 'gift not available';
  end if;

  select * into v_stream from public.live_streams where id = p_stream_id;
  if not found then
    raise exception 'stream not found';
  end if;
  if v_stream.status <> 'live' then
    raise exception 'the stream is not live';
  end if;
  if v_stream.creator_id = v_sender then
    raise exception 'you cannot send a gift to your own stream';
  end if;

  -- Held until this transaction ends, so a second gift from the same sender
  -- waits here and then sees the balance after this one is spent.
  perform pg_advisory_xact_lock(hashtext('send_live_gift'), hashtext(v_sender::text));

  v_balance := public.gift_balance();
  if v_balance < v_gift.price then
    raise exception 'not enough gift credit';
  end if;

  insert into public.live_gift_sends (stream_id, sender_id, gift_id, amount)
  values (p_stream_id, v_sender, p_gift_id, v_gift.price)
  returning id into v_send_id;

  update public.live_streams
     set gift_total = gift_total + v_gift.price
   where id = p_stream_id;

  -- Gift income is credited to the creator's wallet right away and stays
  -- separate from the monthly views pool.
  insert into public.wallet_transactions (user_id, kind, amount, reference, note)
  values (v_stream.creator_id, 'gift', v_gift.price, v_send_id::text, v_gift.name);

  return v_send_id;
end;
$$;

revoke execute on function public.send_live_gift(uuid, uuid) from public, anon;
grant execute on function public.send_live_gift(uuid, uuid) to authenticated;

-- Verification: the function now takes the lock.
select proname,
       position('pg_advisory_xact_lock' in prosrc) > 0 as takes_sender_lock
  from pg_proc
 where proname = 'send_live_gift'
   and pronamespace = 'public'::regnamespace;
