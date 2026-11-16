-- Withdrawal fixes.
--
-- 1. Payout details are per creator. request_withdrawal() compared every
--    creator's account with the single site-wide app_settings.payout_account,
--    so once an admin set it, every withdrawal had to go to that one number.
--    Each creator's last-used method and account now live in payout_accounts.
-- 2. A refund (rejected withdrawal) no longer counts as lifetime earnings.
-- 3. Withdrawals are whole shillings, at least UGX 1,000, and MTN/Airtel
--    accounts must be Ugandan mobile numbers.
-- 4. The wallet row is locked while a withdrawal is checked, so two requests
--    at once cannot both pass the balance check.

-- ---------------------------------------------------------------------------
-- 1. Each creator's payout details
-- ---------------------------------------------------------------------------
create table if not exists public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  method text not null check (method in ('mtn', 'airtel', 'bank')),
  account text not null check (char_length(account) between 4 and 120),
  updated_at timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;

drop policy if exists "read own payout account" on public.payout_accounts;
create policy "read own payout account"
  on public.payout_accounts for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.payout_accounts from anon, authenticated;
grant select on public.payout_accounts to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Lifetime earnings count income only
-- ---------------------------------------------------------------------------
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
         lifetime_earnings = lifetime_earnings
           + case when new.kind in ('pool', 'gift', 'adjustment')
                  then greatest(new.amount, 0) else 0 end,
         updated_at = now()
   where user_id = new.user_id;

  return new;
end;
$$;

-- Correct any lifetime earnings already inflated by refunds.
update public.wallets w
   set lifetime_earnings = coalesce((
     select sum(greatest(t.amount, 0))
       from public.wallet_transactions t
      where t.user_id = w.user_id
        and t.kind in ('pool', 'gift', 'adjustment')
   ), 0);

-- ---------------------------------------------------------------------------
-- 3 + 4. Requesting a withdrawal
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
  v_method text := lower(coalesce(nullif(trim(p_method), ''), 'mtn'));
  v_account text := trim(coalesce(p_account, ''));
  v_balance numeric;
  v_request uuid;
begin
  if v_user is null then
    raise exception 'Sign in required';
  end if;

  if p_amount is null or p_amount <> trunc(p_amount) then
    raise exception 'Enter a whole amount in shillings';
  end if;
  if p_amount < 1000 then
    raise exception 'The minimum withdrawal is UGX 1,000';
  end if;

  if v_method not in ('mtn', 'airtel', 'bank') then
    raise exception 'Choose MTN, Airtel or bank transfer';
  end if;
  if v_method in ('mtn', 'airtel') and v_account !~ '^\+2567[0-9]{8}$' then
    raise exception 'Enter a valid MTN or Airtel Uganda number, e.g. 0772123456';
  end if;
  if char_length(v_account) not between 4 and 120 then
    raise exception 'Enter your bank name, account name and account number';
  end if;

  -- Creates the wallet if needed, then holds it until this transaction ends.
  insert into public.wallets (user_id) values (v_user) on conflict (user_id) do nothing;
  select balance into v_balance from public.wallets where user_id = v_user for update;

  if p_amount > v_balance then
    raise exception 'You only have UGX % available', to_char(v_balance, 'FM999,999,999,990');
  end if;

  insert into public.withdrawal_requests (user_id, amount, method, account)
  values (v_user, p_amount, v_method, v_account)
  returning id into v_request;

  insert into public.wallet_transactions (user_id, kind, amount, reference, note)
  values (v_user, 'withdrawal', -p_amount, v_request::text, 'Withdrawal requested');

  -- Remembered for the next withdrawal.
  insert into public.payout_accounts (user_id, method, account, updated_at)
  values (v_user, v_method, v_account, now())
  on conflict (user_id) do update
    set method = excluded.method, account = excluded.account, updated_at = now();

  return v_request;
end;
$$;

revoke execute on function public.request_withdrawal(numeric, text, text) from public, anon;
grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

-- Verification
select proname from pg_proc where proname in ('request_withdrawal', 'sync_wallet_balance');
