-- HappinessHub subscription plans (billing tiers)
-- Run AFTER 0003_content_and_payments.sql.
--
-- Plans:
--   24h  UGX 1,000  -> 24 hours
--   3d   UGX 3,000  -> 3 days
--   7d   UGX 5,000  -> 1 week
--   30d  UGX 10,000 -> 1 month
--
-- Subscriptions now carry the chosen plan and an expiry. Access is granted
-- only while status = 'active' AND expires_at is in the future.

-- ---------------------------------------------------------------------------
-- 1. Plans
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_plans (
  id text primary key check (id in ('24h', '3d', '7d', '30d')),
  name text not null,
  amount numeric not null check (amount > 0),
  duration_days integer not null check (duration_days > 0),
  sort_order integer not null default 0
);

insert into public.subscription_plans (id, name, amount, duration_days, sort_order)
values
  ('24h', '24 Hours', 1000, 1, 1),
  ('3d',  '3 Days',   3000, 3, 2),
  ('7d',  '1 Week',   5000, 7, 3),
  ('30d', '1 Month', 10000, 30, 4)
on conflict (id) do nothing;  -- keeps admin-edited amounts on re-run

alter table public.subscription_plans enable row level security;

grant select on public.subscription_plans to authenticated;
grant update on public.subscription_plans to authenticated;  -- RLS gates rows

drop policy if exists "read plans" on public.subscription_plans;
create policy "read plans" on public.subscription_plans
  for select using (true);

drop policy if exists "admin updates plans" on public.subscription_plans;
create policy "admin updates plans" on public.subscription_plans
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. subscriptions: chosen plan + expiry
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists plan_id text references public.subscription_plans (id),
  add column if not exists expires_at timestamptz;

-- Legacy rows without a plan cannot be reviewed against the new billing;
-- they are removed so plan_id can be required going forward.
delete from public.subscriptions where plan_id is null;

alter table public.subscriptions
  alter column plan_id set not null;

-- The amount submitted by the client is never trusted: it is overwritten
-- with the plan's amount on insert (and a missing/unknown plan is rejected).
create or replace function public.apply_subscription_plan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.amount := null;
  select amount into new.amount
    from public.subscription_plans
   where id = new.plan_id;

  if new.amount is null then
    raise exception 'unknown subscription plan';
  end if;

  return new;
end;
$$;

drop trigger if exists apply_subscription_plan on public.subscriptions;
create trigger apply_subscription_plan
  before insert on public.subscriptions
  for each row execute function public.apply_subscription_plan();

-- ---------------------------------------------------------------------------
-- 3. Access now expires: active AND not past expires_at
-- ---------------------------------------------------------------------------
create or replace function public.has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$;

revoke execute on function public.has_active_subscription() from public, anon;
grant execute on function public.has_active_subscription() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Approval stamps the expiry from the plan duration
-- ---------------------------------------------------------------------------
create or replace function public.admin_review_subscription(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;
  if p_status not in ('active', 'rejected') then
    raise exception 'invalid status';
  end if;

  update public.subscriptions
     set status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         expires_at = case
           when p_status = 'active' then (
             select now() + make_interval(days => pl.duration_days)
               from public.subscription_plans pl
              where pl.id = subscriptions.plan_id
           )
           else null
         end
   where id = p_id and status = 'pending';

  if not found then
    raise exception 'pending request not found';
  end if;
end;
$$;

revoke execute on function public.admin_review_subscription(uuid, text) from public, anon;
grant execute on function public.admin_review_subscription(uuid, text) to authenticated;
