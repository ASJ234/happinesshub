-- HappinessHub content, subscriptions, and payments
-- Run AFTER 0001_auth_setup.sql and 0002_security_hardening.sql.
-- Idempotent: safe to run more than once.
--
-- Adds:
--   1. public.videos            — creator uploads (private files, padlocked playback)
--   2. public.subscriptions     — manual deposit requests awaiting admin approval
--   3. public.payment_settings  — the account/number admins display for deposits
--   4. Storage buckets          — "videos" (private) and "thumbnails" (public)
--   5. Helper functions/RPCs    — is_admin, is_creator, view counting,
--                                 subscription review, user deletion

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_creator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('creator', 'admin')
  );
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_creator() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_creator() to authenticated;

-- ---------------------------------------------------------------------------
-- 1. videos
--    Playback is locked app-side: creators watch their own uploads for free,
--    everyone else needs an active (admin-approved) subscription.
-- ---------------------------------------------------------------------------
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  category text not null default 'explore'
    check (category in ('appetizers', 'celebrity-leaks', 'live-sex', 'quickies',
                        'picha', 'hookup-corner', 'masseuse', 'explore')),
  video_path text not null,      -- object path inside the private "videos" bucket
  thumbnail_path text,           -- object path inside the public "thumbnails" bucket
  views bigint not null default 0,
  status text not null default 'published' check (status in ('published', 'draft', 'scheduled')),
  created_at timestamptz not null default now()
);

create index if not exists videos_category_idx on public.videos (category, created_at desc);
create index if not exists videos_creator_idx on public.videos (creator_id, created_at desc);

alter table public.videos enable row level security;

grant select, delete on public.videos to authenticated;
-- views and creator_id are deliberately not client-writable: views only move
-- through increment_video_views(), creator_id is pinned by the insert policy.
revoke insert, update on public.videos from authenticated;
grant insert (creator_id, title, description, category, video_path, thumbnail_path, status)
  on public.videos to authenticated;
grant update (title, description, category, status, thumbnail_path)
  on public.videos to authenticated;

drop policy if exists "select visible videos" on public.videos;
create policy "select visible videos" on public.videos
  for select using (
    status = 'published' or creator_id = auth.uid() or public.is_admin()
  );

drop policy if exists "insert own videos" on public.videos;
create policy "insert own videos" on public.videos
  for insert with check (creator_id = auth.uid() and public.is_creator());

drop policy if exists "update own videos" on public.videos;
create policy "update own videos" on public.videos
  for update
  using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid() or public.is_admin());

drop policy if exists "delete own videos" on public.videos;
create policy "delete own videos" on public.videos
  for delete using (creator_id = auth.uid() or public.is_admin());

-- View counter: the only way any client changes videos.views.
create or replace function public.increment_video_views(p_video_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.videos set views = views + 1
  where id = p_video_id and status = 'published';
$$;

revoke execute on function public.increment_video_views(uuid) from public, anon;
grant execute on function public.increment_video_views(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. subscriptions — manual deposit requests.
--    Flow: user deposits to the displayed account, submits the transaction
--    reference, admin approves -> status 'active' -> padlocks open.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null check (amount > 0),
  paid_from text not null,     -- phone/bank number the deposit was sent from
  reference text not null,     -- transaction reference shown to the admin
  note text,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- A user may only have one request awaiting review at a time.
create unique index if not exists subscriptions_one_pending
  on public.subscriptions (user_id) where status = 'pending';
create index if not exists subscriptions_status_idx on public.subscriptions (status, created_at desc);

alter table public.subscriptions enable row level security;

grant select, insert on public.subscriptions to authenticated;
revoke update, delete on public.subscriptions from authenticated;

drop policy if exists "select own subscriptions" on public.subscriptions;
create policy "select own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "admin selects all subscriptions" on public.subscriptions;
create policy "admin selects all subscriptions" on public.subscriptions
  for select using (public.is_admin());

drop policy if exists "submit own pending subscription" on public.subscriptions;
create policy "submit own pending subscription" on public.subscriptions
  for insert with check (auth.uid() = user_id and status = 'pending');

create or replace function public.has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid() and status = 'active'
  );
$$;

revoke execute on function public.has_active_subscription() from public, anon;
grant execute on function public.has_active_subscription() to authenticated;

-- Admin approves/rejects a pending request.
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
         reviewed_at = now()
   where id = p_id and status = 'pending';

  if not found then
    raise exception 'pending request not found';
  end if;
end;
$$;

revoke execute on function public.admin_review_subscription(uuid, text) from public, anon;
grant execute on function public.admin_review_subscription(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. payment_settings — single row: where customers send the money.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_settings (
  id boolean primary key default true check (id),
  account_name text not null default 'HappinessHub Payments',
  phone_number text not null default '+256 700 000 000',
  amount numeric not null default 19.99 check (amount > 0),
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id) values (true) on conflict (id) do nothing;

alter table public.payment_settings enable row level security;

grant select, update on public.payment_settings to authenticated;

drop policy if exists "read payment settings" on public.payment_settings;
create policy "read payment settings" on public.payment_settings
  for select using (true);

drop policy if exists "admin updates payment settings" on public.payment_settings;
create policy "admin updates payment settings" on public.payment_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Profile role rules.
--    Open read: creator display names/username appear on video cards.
--    Role changes: admins may change any role; a signed-in user may promote
--    only themselves from viewer -> creator (the "become a creator" flow).
--    Everything else stays blocked by 0002's trigger + column grants.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles
  for select using (true);

drop policy if exists "admin selects all profiles" on public.profiles;
create policy "admin selects all profiles" on public.profiles
  for select using (public.is_admin());

drop policy if exists "admin updates all profiles" on public.profiles;
create policy "admin updates all profiles" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

grant update (role) on public.profiles to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  jwt_role text;
begin
  begin
    jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
  exception when others then
    jwt_role := null;
  end;

  if new.role is distinct from old.role
     and jwt_role is not null
     and jwt_role <> 'service_role' then
    -- Admins manage roles from the admin panel.
    if public.is_admin() then
      return new;
    end if;
    -- Anyone may upgrade their own account from viewer to creator.
    if auth.uid() = new.id and old.role = 'viewer' and new.role = 'creator' then
      return new;
    end if;
    raise exception 'profile role cannot be changed by this request';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Admin user deletion (removes the auth user; profiles cascade).
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'you cannot delete your own account';
  end if;

  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'user not found';
  end if;
end;
$$;

revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Storage buckets
--    videos: private — readable only by the owner, admins, or active
--            subscribers (signed URLs are issued by /api/videos/[id]/stream
--            after the app's own access check).
--    thumbnails: public — cover images are safe to show on locked cards.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

-- videos bucket
drop policy if exists "upload own video files" on storage.objects;
create policy "upload own video files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "read allowed video files" on storage.objects;
create policy "read allowed video files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'videos'
    and (
      owner = auth.uid()
      or public.is_admin()
      or public.has_active_subscription()
    )
  );

drop policy if exists "delete own video files" on storage.objects;
create policy "delete own video files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'videos' and (owner = auth.uid() or public.is_admin()));

-- thumbnails bucket (public read; RLS still gates writes)
drop policy if exists "upload own thumbnails" on storage.objects;
create policy "upload own thumbnails" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "read thumbnails" on storage.objects;
create policy "read thumbnails" on storage.objects
  for select using (bucket_id = 'thumbnails');

drop policy if exists "delete own thumbnails" on storage.objects;
create policy "delete own thumbnails" on storage.objects
  for delete to authenticated
  using (bucket_id = 'thumbnails' and (owner = auth.uid() or public.is_admin()));
