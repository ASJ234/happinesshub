-- Creator wallets, the monthly revenue pool and withdrawals.
--
-- Money model:
--   * The monthly pool (public.app_settings.monthly_pool) is subscription
--     revenue only. It is split between creators in proportion to the views
--     they collected in that period (public.video_views).
--   * run_monthly_payouts() is idempotent: running it twice for the same
--     period never pays the same creator twice.
--   * Withdrawals hold the money immediately: the balance is debited when the
--     request is created and refunded when an admin rejects it.
--   * Live gifts are credited separately as kind 'gift' so the pool and the
--     gift income never blur into each other.

-- ---------------------------------------------------------------------------
-- 1. wallets
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance numeric not null default 0 check (balance >= 0),
  lifetime_earnings numeric not null default 0 check (lifetime_earnings >= 0),
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;

drop policy if exists "read own wallet" on public.wallets;
create policy "read own wallet"
  on public.wallets for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.wallets from anon, authenticated;
grant select on public.wallets to authenticated;

-- ---------------------------------------------------------------------------
-- 2. wallet_transactions — the ledger every balance is derived from.
-- ---------------------------------------------------------------------------
create table if not exists public.wallet_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('pool', 'gift', 'withdrawal', 'refund', 'adjustment')),
  amount numeric not null,        -- signed: positive credits, negative debits
  period text,                    -- 'YYYY-MM' for pool payouts
  reference text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_idx
  on public.wallet_transactions (user_id, created_at desc);
create unique index if not exists wallet_transactions_pool_unique
  on public.wallet_transactions (user_id, period)
  where kind = 'pool';

alter table public.wallet_transactions enable row level security;

drop policy if exists "read own wallet transactions" on public.wallet_transactions;
create policy "read own wallet transactions"
  on public.wallet_transactions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.wallet_transactions from anon, authenticated;
grant select on public.wallet_transactions to authenticated;

-- Keep wallets in sync with the ledger.
create or replace function public.sync_wallet_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wallets (user_id, balance, lifetime_earnings)
  values (new.user_id, 0, 0)
  on conflict (user_id) do nothing;

  update public.wallets
     set balance = balance + new.amount,
         lifetime_earnings = lifetime_earnings + greatest(new.amount, 0),
         updated_at = now()
   where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists wallet_transactions_sync_wallet on public.wallet_transactions;
create trigger wallet_transactions_sync_wallet
  after insert on public.wallet_transactions
  for each row execute function public.sync_wallet_balance();

-- ---------------------------------------------------------------------------
-- 3. withdrawal_requests
-- ---------------------------------------------------------------------------
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null check (amount > 0),
  method text not null default 'mtn',
  account text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists withdrawal_requests_user_idx
  on public.withdrawal_requests (user_id, created_at desc);
create index if not exists withdrawal_requests_status_idx
  on public.withdrawal_requests (status, created_at desc);

alter table public.withdrawal_requests enable row level security;

drop policy if exists "read own withdrawals" on public.withdrawal_requests;
create policy "read own withdrawals"
  on public.withdrawal_requests for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.withdrawal_requests from anon, authenticated;
grant select on public.withdrawal_requests to authenticated;

-- ---------------------------------------------------------------------------
-- 4. A creator asks to withdraw. The balance is held right away.
-- ---------------------------------------------------------------------------
create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_account text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric;
  v_request uuid;
  v_settings public.app_settings;
begin
  if v_user is null then
    raise exception 'sign in required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount';
  end if;

  if p_account is null or length(trim(p_account)) < 4 then
    raise exception 'invalid account';
  end if;

  select balance into v_balance from public.wallets where user_id = v_user;
  v_balance := coalesce(v_balance, 0);

  if p_amount > v_balance then
    raise exception 'amount exceeds your balance of %', v_balance;
  end if;

  select * into v_settings from public.app_settings where id = true;
  if v_settings is not null and nullif(trim(v_settings.payout_account), '') is not null
     and trim(v_settings.payout_account) <> trim(p_account) then
    raise exception 'the payout account does not match the one on file';
  end if;

  insert into public.withdrawal_requests (user_id, amount, method, account)
  values (v_user, p_amount, coalesce(nullif(trim(p_method), ''), 'mtn'), trim(p_account))
  returning id into v_request;

  insert into public.wallet_transactions (user_id, kind, amount, reference, note)
  values (v_user, 'withdrawal', -p_amount, v_request::text, 'Withdrawal requested');

  return v_request;
end;
$$;

revoke execute on function public.request_withdrawal(numeric, text, text) from public, anon;
grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

-- Admin marks a withdrawal as paid or rejects it (and refunds the hold).
create or replace function public.admin_review_withdrawal(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;
  if p_status not in ('paid', 'rejected') then
    raise exception 'invalid status';
  end if;

  update public.withdrawal_requests
     set status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_id and status = 'pending';

  if not found then
    raise exception 'pending request not found';
  end if;

  if p_status = 'rejected' then
    insert into public.wallet_transactions (user_id, kind, amount, reference, note)
    select user_id, 'refund', amount, p_id::text, 'Withdrawal rejected'
      from public.withdrawal_requests
     where id = p_id;
  end if;
end;
$$;

revoke execute on function public.admin_review_withdrawal(uuid, text) from public, anon;
grant execute on function public.admin_review_withdrawal(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. The monthly pool, split by views.
-- ---------------------------------------------------------------------------
create or replace function public.run_monthly_payouts(p_period text)
returns table (creator_id uuid, views bigint, amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool numeric;
  v_from date;
  v_to date;
  v_total_views bigint;
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  if p_period is null or p_period !~ '^[0-9]{4}-[0-9]{2}$' then
    raise exception 'period must look like YYYY-MM';
  end if;

  v_from := to_date(p_period || '-01', 'YYYY-MM-DD');
  v_to := (v_from + interval '1 month')::date;

  select monthly_pool into v_pool from public.app_settings where id = true;
  v_pool := coalesce(v_pool, 0);

  if v_pool <= 0 then
    raise exception 'the monthly pool is empty';
  end if;

  select coalesce(sum(c.views), 0) into v_total_views
    from (
      select v.creator_id, count(*)::bigint as views
        from public.video_views vv
        join public.videos v on v.id = vv.video_id
       where vv.view_date >= v_from and vv.view_date < v_to
       group by v.creator_id
    ) c;

  if v_total_views = 0 then
    raise exception 'no views were collected in %', p_period;
  end if;

  return query
  with share as (
    select v.creator_id,
           count(*)::bigint as views,
           round(v_pool * (count(*)::numeric / v_total_views), 2) as amount
      from public.video_views vv
      join public.videos v on v.id = vv.video_id
     where vv.view_date >= v_from and vv.view_date < v_to
     group by v.creator_id
  )
  select s.creator_id, s.views, s.amount
    from share s
   where s.amount > 0
     and not exists (
       select 1 from public.wallet_transactions wt
        where wt.user_id = s.creator_id
          and wt.kind = 'pool'
          and wt.period = p_period
     );

  -- Only pay the creators that pass the guard above.
  insert into public.wallet_transactions (user_id, kind, amount, period, note)
  select s.creator_id, 'pool', s.amount, p_period, 'Monthly revenue pool'
    from (
      select v.creator_id,
             round(v_pool * (count(*)::numeric / v_total_views), 2) as amount
        from public.video_views vv
        join public.videos v on v.id = vv.video_id
       where vv.view_date >= v_from and vv.view_date < v_to
       group by v.creator_id
    ) s
   where s.amount > 0
     and not exists (
       select 1 from public.wallet_transactions wt
        where wt.user_id = s.creator_id
          and wt.kind = 'pool'
          and wt.period = p_period
     );
end;
$$;

revoke execute on function public.run_monthly_payouts(text) from public, anon;
grant execute on function public.run_monthly_payouts(text) to authenticated;

-- Verification: the pool only pays out when it is run for a real period.
select id, monthly_pool, payout_method, payout_account
  from public.app_settings;

select user_id, balance, lifetime_earnings from public.wallets;
