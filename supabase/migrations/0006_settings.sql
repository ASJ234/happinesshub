-- Single-row application settings: support contact, payout details and the
-- monthly creator revenue pool.
--
-- The table is locked to a single row (id = true), the same pattern used by
-- public.payment_settings.

create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  site_name text not null default 'Happyporn.com',
  support_whatsapp text not null default '+256700000000',
  support_message text not null default 'Hi, I need help with Happyporn.com',
  payout_method text not null default 'mtn',
  payout_account text not null default '',
  monthly_pool numeric not null default 0 check (monthly_pool >= 0),
  -- ISO weekdays that allow going live: 1 = Monday ... 7 = Sunday.
  -- The default excludes Monday (1), Tuesday (2) and Thursday (4).
  live_allowed_weekdays integer[] not null default '{3,5,6,7}',
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "read app settings" on public.app_settings;
create policy "read app settings"
  on public.app_settings for select
  to authenticated
  using (true);

drop policy if exists "admin updates app settings" on public.app_settings;
create policy "admin updates app settings"
  on public.app_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke insert, delete on public.app_settings from anon, authenticated;
grant select on public.app_settings to authenticated;
grant update on public.app_settings to authenticated;

-- Verification: should return exactly one row.
select id, site_name, support_whatsapp, payout_method, monthly_pool, live_allowed_weekdays
  from public.app_settings;
