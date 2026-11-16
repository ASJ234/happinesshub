-- Picha becomes a photo wall instead of a directory of profiles.
--
-- Creators and admins upload photos straight to the public 'thumbnails'
-- bucket (under <user id>/picha/), with a small preview for the grid, and a
-- picha_photos row records each one. Everyone signed in can see them. The
-- owner or an admin can delete a photo.
--
-- Gallery photos already on Picha profiles are copied in, so nothing posted
-- before disappears. The old Picha listings stay in the database untouched
-- but are no longer shown.

create table if not exists public.picha_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null unique,          -- full-size image in 'thumbnails'
  thumb_path text,                    -- small preview; falls back to path
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now()
);

create index if not exists picha_photos_created_idx
  on public.picha_photos (created_at desc, id desc);
create index if not exists picha_photos_user_idx
  on public.picha_photos (user_id, created_at desc);

alter table public.picha_photos enable row level security;

revoke all on public.picha_photos from anon, authenticated;
grant select, delete on public.picha_photos to authenticated;
grant insert (user_id, path, thumb_path, width, height)
  on public.picha_photos to authenticated;

drop policy if exists "read picha photos" on public.picha_photos;
create policy "read picha photos"
  on public.picha_photos for select
  to authenticated
  using (true);

-- Only creators and admins post, only as themselves, only into their folder.
drop policy if exists "creators post picha photos" on public.picha_photos;
create policy "creators post picha photos"
  on public.picha_photos for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and split_part(path, '/', 1) = auth.uid()::text
    and (thumb_path is null or split_part(thumb_path, '/', 1) = auth.uid()::text)
    and exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role in ('creator', 'admin')
    )
  );

drop policy if exists "delete own picha photos" on public.picha_photos;
create policy "delete own picha photos"
  on public.picha_photos for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Copy the gallery photos of existing Picha profiles.
insert into public.picha_photos (user_id, path, created_at)
select l.user_id, ph.path, ph.created_at
  from public.listing_photos ph
  join public.listings l on l.id = ph.listing_id
 where l.category = 'picha'
   and ph.bucket = 'thumbnails'
   and ph.kind in ('gallery', 'other')
on conflict (path) do nothing;

-- Verification
select count(*) as picha_photos from public.picha_photos;
