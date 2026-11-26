-- Creator referrals.
--
-- Rules:
--   * A creator shares /login?ref=<username>. Whoever signs up through it is
--     recorded as that creator's referral (only creators can refer).
--   * A referral counts once the referred user has an active (paid)
--     subscription. Creators only ever see paid referrals.
--   * Every full block of 100 paid referrals is worth UGX 20,000. A creator
--     withdraws whole blocks only: with 126 paid referrals, 100 are withdrawn
--     (UGX 20,000) and 26 stay on the page towards the next block.
--   * A withdrawal is a payout request to the creator's MTN/Airtel number.
--     The referrals in it are held while an admin sends the money. When the
--     admin marks it paid they are withdrawn (redeemed_at is set); when the
--     admin rejects it they are released and count again.

-- ---------------------------------------------------------------------------
-- 1. referrals — one row per referred user.
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  referred_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  paid_at timestamptz,        -- first time the referred user's subscription was active
  redeemed_at timestamptz,    -- when this referral was withdrawn
  check (referred_id <> referrer_id)
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_id, paid_at)
  where paid_at is not null;

alter table public.referrals enable row level security;

drop policy if exists "read own referrals" on public.referrals;
create policy "read own referrals"
  on public.referrals for select
  to authenticated
  using (referrer_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Record the referrer at signup.
--    referred_by comes from signup metadata, so it is only trusted to name a
--    referrer: it must be an existing creator. A bad value never blocks the
--    signup itself.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_ref text := lower(trim(coalesce(new.raw_user_meta_data->>'referred_by', '')));
begin
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), new.id::text),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''),
             new.raw_user_meta_data->>'username',
             ''),
    'viewer'
  )
  on conflict (id) do nothing;

  if v_ref <> '' then
    begin
      insert into public.referrals (referred_id, referrer_id)
      select new.id, p.id
        from public.profiles p
       where p.username = v_ref
         and p.role = 'creator'
         and p.id <> new.id
      on conflict (referred_id) do nothing;
    exception when others then
      raise warning 'referral not recorded: %', sqlerrm;
    end;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. A referral becomes paid when the referred user's subscription goes
--    active, whichever path activated it (admin review, MarzPay, links).
--    If that subscription is revoked before the referral is in a withdrawal
--    and the user has no other active subscription, it stops counting.
-- ---------------------------------------------------------------------------
create or replace function public.sync_referral_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' then
    update public.referrals
       set paid_at = now()
     where referred_id = new.user_id
       and paid_at is null;
  elsif tg_op = 'UPDATE' and old.status = 'active' and new.status = 'revoked' then
    update public.referrals r
       set paid_at = null
     where r.referred_id = new.user_id
       and r.redeemed_at is null
       and r.payout_id is null
       and not exists (
         select 1 from public.subscriptions s
          where s.user_id = new.user_id
            and s.status = 'active'
            and s.id <> new.id
       );
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_sync_referral on public.subscriptions;
create trigger subscriptions_sync_referral
  after insert or update of status on public.subscriptions
  for each row execute function public.sync_referral_paid();

-- ---------------------------------------------------------------------------
-- 4. referral_payouts — a creator's request to be paid for full blocks.
-- ---------------------------------------------------------------------------
-- An earlier draft of this file credited the wallet instead.
drop function if exists public.redeem_referrals();

create table if not exists public.referral_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  referrals int not null check (referrals > 0),
  amount numeric not null check (amount > 0),
  method text not null check (method in ('mtn', 'airtel')),
  account text not null check (account ~ '^\+2567[0-9]{8}$'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- One request waiting at a time per creator.
create unique index if not exists referral_payouts_one_pending
  on public.referral_payouts (user_id) where status = 'pending';
create index if not exists referral_payouts_status_idx
  on public.referral_payouts (status, created_at desc);

alter table public.referral_payouts enable row level security;

drop policy if exists "read own referral payouts" on public.referral_payouts;
create policy "read own referral payouts"
  on public.referral_payouts for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.referral_payouts from anon, authenticated;
grant select on public.referral_payouts to authenticated;

-- The referrals held by (and, once paid, withdrawn through) a payout.
alter table public.referrals
  add column if not exists payout_id uuid
  references public.referral_payouts (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 5. A creator asks to be paid for every full block of 100.
--    Keep REFERRAL_BLOCK / REFERRAL_BLOCK_REWARD in src/lib/referrals.ts in
--    step with these numbers.
-- ---------------------------------------------------------------------------
create or replace function public.request_referral_payout(p_method text, p_account text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c_block constant int := 100;
  c_reward constant numeric := 20000;
  v_user uuid := auth.uid();
  v_method text := lower(trim(coalesce(p_method, '')));
  v_account text := trim(coalesce(p_account, ''));
  v_role text;
  v_available int;
  v_blocks int;
  v_payout uuid;
begin
  if v_user is null then
    raise exception 'Sign in required';
  end if;

  -- The profile row is the lock: one request per creator at a time.
  select role into v_role from public.profiles where id = v_user for update;
  if v_role is distinct from 'creator' then
    raise exception 'Only creators can withdraw referrals';
  end if;

  if v_method not in ('mtn', 'airtel') then
    raise exception 'Choose MTN or Airtel';
  end if;
  if v_account !~ '^\+2567[0-9]{8}$' then
    raise exception 'Enter a valid MTN or Airtel Uganda number, e.g. 0772123456';
  end if;

  if exists (select 1 from public.referral_payouts
              where user_id = v_user and status = 'pending') then
    raise exception 'You already have a withdrawal waiting for an admin';
  end if;

  select count(*) into v_available
    from public.referrals
   where referrer_id = v_user
     and paid_at is not null
     and redeemed_at is null
     and payout_id is null;

  v_blocks := v_available / c_block;
  if v_blocks < 1 then
    raise exception 'You need % more paid referrals to withdraw', c_block - v_available;
  end if;

  insert into public.referral_payouts (user_id, referrals, amount, method, account)
  values (v_user, v_blocks * c_block, v_blocks * c_reward, v_method, v_account)
  returning id into v_payout;

  -- The oldest paid referrals go first; the rest carry over.
  update public.referrals
     set payout_id = v_payout
   where referred_id in (
     select referred_id
       from public.referrals
      where referrer_id = v_user
        and paid_at is not null
        and redeemed_at is null
        and payout_id is null
      order by paid_at, referred_id
      limit v_blocks * c_block
   );

  -- Remembered for the creator's next withdrawal.
  insert into public.payout_accounts (user_id, method, account, updated_at)
  values (v_user, v_method, v_account, now())
  on conflict (user_id) do update
    set method = excluded.method, account = excluded.account, updated_at = now();

  return v_payout;
end;
$$;

revoke execute on function public.request_referral_payout(text, text) from public, anon;
grant execute on function public.request_referral_payout(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. The admin sends the money and marks it paid, or rejects it.
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_referral_payout(p_id uuid, p_status text)
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

  update public.referral_payouts
     set status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_id and status = 'pending';

  if not found then
    raise exception 'pending withdrawal not found';
  end if;

  if p_status = 'paid' then
    update public.referrals
       set redeemed_at = now()
     where payout_id = p_id;
  else
    update public.referrals
       set payout_id = null
     where payout_id = p_id;
  end if;
end;
$$;

revoke execute on function public.admin_review_referral_payout(uuid, text) from public, anon;
grant execute on function public.admin_review_referral_payout(uuid, text) to authenticated;

-- Verification
select proname from pg_proc
 where proname in ('handle_new_user', 'sync_referral_paid',
                   'request_referral_payout', 'admin_review_referral_payout');
