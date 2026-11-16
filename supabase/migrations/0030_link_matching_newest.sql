-- Payment-link matching credited the wrong person when one number had
-- several waiting requests.
--
-- match_link_payment() and match_gift_link_payment() gave a completed
-- payment to the OLDEST waiting request from that number. When a number was
-- reused (a payment failed and someone tried again, or one phone paid for
-- several accounts), every payment went to the previous request and the
-- newest payer waited until the next payment came in.
--
-- Now:
--   * A completed payment goes to the NEWEST waiting request from that
--     number: the one made just before paying.
--   * A failed or cancelled payment marks the newest waiting request from
--     that number as failed (subscriptions) or cancelled (gift top-ups), so
--     the payer sees it didn't go through.
--   * A completed payment can still match a request marked failed or
--     cancelled in the last hour: the payer may retry on the same MarzPay page
--     after a failure, without starting a new request. Newest-first keeps a
--     later request from someone else ahead of it.

-- ---------------------------------------------------------------------------
-- 1. Subscriptions
-- ---------------------------------------------------------------------------
create or replace function public.match_link_payment(
  p_phone text,
  p_amount numeric,
  p_transaction_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_transaction_id is not null then
    select id into v_id from public.subscriptions
     where provider_transaction_id = p_transaction_id;
    if found then
      return v_id;  -- already used
    end if;
  end if;

  select s.id into v_id
    from public.subscriptions s
   where s.method = 'link'
     and s.status in ('pending', 'failed')
     and s.paid_from = p_phone
     and s.amount <= p_amount
     and s.created_at > now() - interval '1 hour'
   order by s.created_at desc
   limit 1
   for update skip locked;

  if v_id is null then
    return null;
  end if;

  update public.subscriptions s
     set status = 'active',
         reviewed_at = now(),
         provider_transaction_id = p_transaction_id,
         expires_at = now() + make_interval(days => (
           select duration_days from public.subscription_plans where id = s.plan_id
         ))
   where s.id = v_id;

  return v_id;
end;
$$;

create or replace function public.fail_link_payment(p_phone text, p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select s.id into v_id
    from public.subscriptions s
   where s.method = 'link'
     and s.status = 'pending'
     and s.paid_from = p_phone
     and (p_amount is null or s.amount <= p_amount)
     and s.created_at > now() - interval '1 hour'
   order by s.created_at desc
   limit 1
   for update skip locked;

  if v_id is not null then
    update public.subscriptions
       set status = 'failed', reviewed_at = now()
     where id = v_id;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.fail_link_payment(text, numeric)
  from public, anon, authenticated;
grant execute on function public.fail_link_payment(text, numeric) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Gift top-ups
-- ---------------------------------------------------------------------------
create or replace function public.match_gift_link_payment(
  p_phone text,
  p_amount numeric,
  p_transaction_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_transaction_id is not null then
    select id into v_id from public.gift_deposits
     where provider_transaction_id = p_transaction_id;
    if found then
      return v_id;  -- already credited
    end if;
  end if;

  select d.id into v_id
    from public.gift_deposits d
   where d.method = 'link'
     and d.status in ('pending', 'cancelled')
     and d.paid_from = p_phone
     and d.amount <= p_amount
     and d.created_at > now() - interval '1 hour'
   order by d.created_at desc
   limit 1
   for update skip locked;

  if v_id is null then
    return null;
  end if;

  update public.gift_deposits
     set status = 'approved',
         reviewed_at = now(),
         provider_transaction_id = p_transaction_id
   where id = v_id;

  return v_id;
end;
$$;

create or replace function public.fail_gift_link_payment(p_phone text, p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select d.id into v_id
    from public.gift_deposits d
   where d.method = 'link'
     and d.status = 'pending'
     and d.paid_from = p_phone
     and (p_amount is null or d.amount <= p_amount)
     and d.created_at > now() - interval '1 hour'
   order by d.created_at desc
   limit 1
   for update skip locked;

  if v_id is not null then
    update public.gift_deposits
       set status = 'cancelled', reviewed_at = now()
     where id = v_id;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.fail_gift_link_payment(text, numeric)
  from public, anon, authenticated;
grant execute on function public.fail_gift_link_payment(text, numeric) to service_role;

-- Verification
select proname from pg_proc
 where proname in ('match_link_payment', 'fail_link_payment',
                   'match_gift_link_payment', 'fail_gift_link_payment');
