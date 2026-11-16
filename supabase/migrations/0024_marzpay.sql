-- Subscriptions paid through MarzPay's Collect Money API.
--
-- The server charges the subscriber's phone with a reference of its own
-- (stored in subscriptions.reference). MarzPay posts the result to
-- /api/webhooks/marzpay, and the server re-checks it with MarzPay before
-- calling marzpay_settle_subscription(), which opens the padlocks.
--
-- Manual deposits keep working for rows that are already pending, but only
-- the server (service role) can create MarzPay rows.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists method text not null default 'manual',
  add column if not exists provider_reference text,       -- MarzPay transaction uuid
  add column if not exists provider_transaction_id text;  -- MTN/Airtel transaction id

alter table public.subscriptions
  drop constraint if exists subscriptions_method_check;
alter table public.subscriptions
  add constraint subscriptions_method_check check (method in ('manual', 'marzpay'));

-- 'failed': the charge was declined, cancelled or timed out.
alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('pending', 'active', 'rejected', 'failed'));

create unique index if not exists subscriptions_marzpay_reference
  on public.subscriptions (reference) where method = 'marzpay';

-- ---------------------------------------------------------------------------
-- 2. Users may still insert manual requests, never MarzPay ones
-- ---------------------------------------------------------------------------
drop policy if exists "submit own pending subscription" on public.subscriptions;
create policy "submit own pending subscription"
  on public.subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending' and method = 'manual');

-- ---------------------------------------------------------------------------
-- 3. Settle a MarzPay charge (service role only)
--    Returns: active | already_active | failed | amount_mismatch | not_found
-- ---------------------------------------------------------------------------
create or replace function public.marzpay_settle_subscription(
  p_reference text,
  p_completed boolean,
  p_amount numeric,
  p_provider_transaction_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.subscriptions;
begin
  select * into v_row
    from public.subscriptions
   where reference = p_reference and method = 'marzpay'
   for update;

  if not found then
    return 'not_found';
  end if;
  if v_row.status = 'active' then
    return 'already_active';
  end if;

  if not p_completed then
    update public.subscriptions
       set status = 'failed', reviewed_at = now()
     where id = v_row.id and status = 'pending';
    return 'failed';
  end if;

  -- A payment that completes after the row was marked failed (the user gave
  -- up waiting) still opens the padlocks: the money arrived.
  if p_amount is not null and p_amount < v_row.amount then
    return 'amount_mismatch';
  end if;

  update public.subscriptions
     set status = 'active',
         reviewed_at = now(),
         provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
         expires_at = now() + make_interval(days => (
           select duration_days from public.subscription_plans where id = v_row.plan_id
         ))
   where id = v_row.id;

  return 'active';
end;
$$;

revoke execute on function public.marzpay_settle_subscription(text, boolean, numeric, text)
  from public, anon, authenticated;
grant execute on function public.marzpay_settle_subscription(text, boolean, numeric, text)
  to service_role;

-- Verification
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'subscriptions'
   and column_name in ('method', 'provider_reference', 'provider_transaction_id');
