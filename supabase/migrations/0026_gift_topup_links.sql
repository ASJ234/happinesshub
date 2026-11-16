-- Gift-credit top-ups through MarzPay payment links.
--
-- A payment link has a fixed amount, so top-ups become packages, each with
-- its own link. The viewer picks a package, enters the number they will pay
-- from and is sent to the link. The pending gift_deposits row is approved by
-- an admin, or matched automatically by match_gift_link_payment() when a
-- signed link callback arrives at /api/webhooks/marzpay-link?for=gift.

-- ---------------------------------------------------------------------------
-- 1. Packages (admins manage them; everyone signed in can read them)
-- ---------------------------------------------------------------------------
create table if not exists public.gift_topup_packages (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null unique check (amount >= 500),
  payment_link text check (payment_link is null or payment_link ~ '^https://'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.gift_topup_packages (amount, sort_order)
values (1000, 1), (2000, 2), (5000, 3), (10000, 4)
on conflict (amount) do nothing;

alter table public.gift_topup_packages enable row level security;

grant select on public.gift_topup_packages to authenticated;
grant insert, update, delete on public.gift_topup_packages to authenticated;

drop policy if exists "read gift packages" on public.gift_topup_packages;
create policy "read gift packages"
  on public.gift_topup_packages for select
  to authenticated
  using (true);

drop policy if exists "admin manages gift packages" on public.gift_topup_packages;
create policy "admin manages gift packages"
  on public.gift_topup_packages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. gift_deposits: payment method, cancelled requests, MarzPay transaction
-- ---------------------------------------------------------------------------
alter table public.gift_deposits
  add column if not exists method text not null default 'manual',
  add column if not exists provider_transaction_id text;

alter table public.gift_deposits
  drop constraint if exists gift_deposits_method_check;
alter table public.gift_deposits
  add constraint gift_deposits_method_check check (method in ('manual', 'link'));

alter table public.gift_deposits
  drop constraint if exists gift_deposits_status_check;
alter table public.gift_deposits
  add constraint gift_deposits_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));

create unique index if not exists gift_deposits_provider_transaction_id
  on public.gift_deposits (provider_transaction_id)
  where provider_transaction_id is not null;

-- Link top-ups are created by the server only.
drop policy if exists "submit own gift deposit" on public.gift_deposits;
create policy "submit own gift deposit"
  on public.gift_deposits for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending' and method = 'manual');

-- ---------------------------------------------------------------------------
-- 3. Which kind of link a callback came from
-- ---------------------------------------------------------------------------
alter table public.payment_link_events
  add column if not exists kind text not null default 'subscription',
  add column if not exists gift_deposit_id uuid
    references public.gift_deposits (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Match a completed gift link payment (service role only)
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
     and d.status = 'pending'
     and d.paid_from = p_phone
     and d.amount <= p_amount
     and d.created_at > now() - interval '1 hour'
   order by d.created_at
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

revoke execute on function public.match_gift_link_payment(text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.match_gift_link_payment(text, numeric, text)
  to service_role;

-- Verification
select amount, payment_link from public.gift_topup_packages order by sort_order;
