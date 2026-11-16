-- Subscriptions paid through MarzPay payment links.
--
-- MarzPay only accepts Collect Money API calls from whitelisted IPs, which
-- Vercel cannot provide. Payment links need no whitelist: the customer pays
-- on MarzPay's own page. A link cannot carry our user id, so:
--
--   1. The subscriber picks a plan and enters the number they will pay from.
--      The server stores a pending 'link' subscription and sends them to the
--      plan's link.
--   2. An admin approves it (admin_review_subscription), or, once MarzPay's
--      signed link callback arrives, match_link_payment() activates the
--      pending request with the same phone and amount automatically.
--
-- Every link callback is kept in payment_link_events so the payload can be
-- inspected (MarzPay does not document it).

-- ---------------------------------------------------------------------------
-- 1. A MarzPay link per plan (admins edit it; everyone signed in can read it)
-- ---------------------------------------------------------------------------
alter table public.subscription_plans
  add column if not exists payment_link text;

alter table public.subscription_plans
  drop constraint if exists subscription_plans_payment_link_check;
alter table public.subscription_plans
  add constraint subscription_plans_payment_link_check
  check (payment_link is null or payment_link ~ '^https://');

-- ---------------------------------------------------------------------------
-- 2. 'link' payment method
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  drop constraint if exists subscriptions_method_check;
alter table public.subscriptions
  add constraint subscriptions_method_check
  check (method in ('manual', 'marzpay', 'link'));

-- One MarzPay transaction can open one subscription, however often it is
-- reported.
create unique index if not exists subscriptions_provider_transaction_id
  on public.subscriptions (provider_transaction_id)
  where provider_transaction_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Link callbacks, as received
-- ---------------------------------------------------------------------------
create table if not exists public.payment_link_events (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  signed boolean not null,
  payload jsonb not null,
  phone text,
  amount numeric,
  status text,
  transaction_id text,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  outcome text not null
);

alter table public.payment_link_events enable row level security;
revoke all on public.payment_link_events from anon, authenticated;
grant select on public.payment_link_events to authenticated;

drop policy if exists "admin reads link events" on public.payment_link_events;
create policy "admin reads link events"
  on public.payment_link_events for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Match a completed link payment to a pending request (service role only)
--    The oldest pending 'link' request from the last hour with the same phone
--    and an amount the payment covers. Returns its id, or null.
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
     and s.status = 'pending'
     and s.paid_from = p_phone
     and s.amount <= p_amount
     and s.created_at > now() - interval '1 hour'
   order by s.created_at
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

revoke execute on function public.match_link_payment(text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.match_link_payment(text, numeric, text)
  to service_role;

-- Verification
select id, amount, payment_link from public.subscription_plans order by sort_order;
