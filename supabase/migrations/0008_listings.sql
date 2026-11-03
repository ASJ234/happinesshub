-- Listing sectors: Picha, Wardrobe, Masseuse and Hookups.
--
-- A listing is a profile page rather than a video. It carries a name, photos
-- and (for the service sectors) a phone number and address.
--
-- Contact details live in their own table so that RLS can hide the phone
-- number and address of a listing that has not been verified yet, without
-- hiding the listing itself.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  description text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_category_check check (category in ('picha', 'wardrobe', 'masseuse', 'hookups'))
);

create index if not exists listings_category_idx
  on public.listings (category, created_at desc);
create index if not exists listings_user_idx
  on public.listings (user_id);
-- One profile per creator per sector.
create unique index if not exists listings_user_category_unique
  on public.listings (user_id, category);

create table if not exists public.listing_contacts (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  phone_number text not null check (char_length(phone_number) between 1 and 40),
  address text,
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  path text not null,
  kind text not null default 'gallery'
    check (kind in ('body', 'face', 'gallery', 'product', 'other')),
  -- 'thumbnails' is the public bucket, 'listing-verification' is private.
  bucket text not null default 'thumbnails'
    check (bucket in ('thumbnails', 'listing-verification')),
  created_at timestamptz not null default now()
);

create index if not exists listing_photos_listing_idx
  on public.listing_photos (listing_id, created_at desc);

alter table public.listings enable row level security;
alter table public.listing_contacts enable row level security;
alter table public.listing_photos enable row level security;

-- Listings ------------------------------------------------------------------
drop policy if exists "read listings" on public.listings;
create policy "read listings"
  on public.listings for select
  to authenticated
  using (true);

drop policy if exists "insert own listings" on public.listings;
create policy "insert own listings"
  on public.listings for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "update own listings" on public.listings;
create policy "update own listings"
  on public.listings for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "delete own listings" on public.listings;
create policy "delete own listings"
  on public.listings for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Contacts ------------------------------------------------------------------
-- Hidden until the listing is approved, unless you own it or you are an admin.
drop policy if exists "read listing contacts" on public.listing_contacts;
create policy "read listing contacts"
  on public.listing_contacts for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
        from public.listings l
       where l.id = listing_id
         and l.user_id = auth.uid()
    )
    or exists (
      select 1
        from public.listings l
       where l.id = listing_id
         and l.verification_status = 'approved'
    )
  );

drop policy if exists "write own listing contacts" on public.listing_contacts;
create policy "write own listing contacts"
  on public.listing_contacts for all
  to authenticated
  using (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
    or public.is_admin()
  );

-- Photos --------------------------------------------------------------------
-- Body and face photos live in the private bucket and are never served to
-- other users. Gallery and product photos are public.
drop policy if exists "read listing photos" on public.listing_photos;
create policy "read listing photos"
  on public.listing_photos for select
  to authenticated
  using (
    bucket = 'thumbnails'
    or public.is_admin()
    or exists (
      select 1
        from public.listings l
       where l.id = listing_id
         and l.user_id = auth.uid()
    )
    or exists (
      select 1
        from public.listings l
       where l.id = listing_id
         and l.verification_status = 'approved'
    )
  );

drop policy if exists "insert own listing photos" on public.listing_photos;
create policy "insert own listing photos"
  on public.listing_photos for insert
  to authenticated
  with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  );

drop policy if exists "delete own listing photos" on public.listing_photos;
create policy "delete own listing photos"
  on public.listing_photos for delete
  to authenticated
  using (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
    or public.is_admin()
  );

-- Grants. verification_status is never writable by the listing owner.
revoke insert, update, delete on public.listings from anon, authenticated;
grant select on public.listings to authenticated;
grant insert (user_id, category, display_name, description) on public.listings to authenticated;
grant update (display_name, description) on public.listings to authenticated;
grant delete on public.listings to authenticated;

revoke insert, update, delete on public.listing_contacts from anon, authenticated;
grant select on public.listing_contacts to authenticated;
grant insert (listing_id, phone_number, address) on public.listing_contacts to authenticated;
grant update (phone_number, address) on public.listing_contacts to authenticated;
grant delete on public.listing_contacts to authenticated;

revoke insert, update, delete on public.listing_photos from anon, authenticated;
grant select on public.listing_photos to authenticated;
grant insert (listing_id, path, kind, bucket) on public.listing_photos to authenticated;
grant delete on public.listing_photos to authenticated;

-- Private bucket for the intimate verification photos.
insert into storage.buckets (id, name, public)
values ('listing-verification', 'listing-verification', false)
on conflict (id) do nothing;

drop policy if exists "upload own verification photos" on storage.objects;
create policy "upload own verification photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "read own verification photos" on storage.objects;
create policy "read own verification photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'listing-verification'
    and (
      owner = auth.uid()
      or public.is_admin()
      or exists (
        select 1
          from public.listing_photos p
          join public.listings l on l.id = p.listing_id
         where p.path = name
           and l.verification_status = 'approved'
      )
    )
  );

drop policy if exists "delete own verification photos" on storage.objects;
create policy "delete own verification photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'listing-verification' and (owner = auth.uid() or public.is_admin()));

-- Admin review --------------------------------------------------------------
-- Approving a listing that requires verification demands at least one
-- full-body photo and one face photo.
create or replace function public.admin_review_listing(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.listings;
  v_has_body boolean := false;
  v_has_face boolean := false;
  v_requires_verification boolean := false;
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  if p_status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  select * into v_listing from public.listings where id = p_id;
  if not found then
    raise exception 'listing not found';
  end if;

  select
      coalesce(bool_or(p.kind = 'body'), false),
      coalesce(bool_or(p.kind = 'face'), false)
    into v_has_body, v_has_face
    from public.listing_photos p
   where p.listing_id = p_id;

  select coalesce(c.requires_verification, false)
    into v_requires_verification
    from public.categories c
   where c.slug = v_listing.category;

  if p_status = 'approved' and v_requires_verification and not (v_has_body and v_has_face) then
    raise exception 'a full-body photo and a face photo are both required before approval';
  end if;

  update public.listings
     set verification_status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   where id = p_id;
end $$;

revoke execute on function public.admin_review_listing(uuid, text) from public, anon;
grant execute on function public.admin_review_listing(uuid, text) to authenticated;

-- Verification: four listing sectors, and the admin RPC should exist.
select slug, kind, requires_verification
  from public.categories
 where kind = 'listing'
 order by sort_order;

select category, count(*)
  from public.listings
 group by category
 order by category;
