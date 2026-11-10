-- Service Providers (Masseuse, Hookups) and Vendors (Wardrobe).
--
-- Rules:
--   * Two new account types. A viewer can switch their own account to
--     Creator, Service Provider or Vendor once, from Settings. Any other change
--     is made by an admin.
--   * Only providers publish Masseuse and Hookups profiles, and only one of the
--     two. Only vendors publish Wardrobe shops. Creators keep Picha.
--   * The verification status is decided here, from public.categories, never
--     by the request: Masseuse and Hookups start pending, the rest approved.
--   * A profile can have a profile picture (an 'avatar' photo) and items:
--     services for providers (photo + description) and products for vendors
--     (photo + name + price in UGX, the price is required).
--
-- Run AFTER 0020_comments.sql.

-- ---------------------------------------------------------------------------
-- 1. Account types
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('viewer', 'creator', 'provider', 'vendor', 'admin'));

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
    -- A viewer may switch their own account to one of the public types.
    if auth.uid() = new.id
       and old.role = 'viewer'
       and new.role in ('creator', 'provider', 'vendor') then
      return new;
    end if;
    raise exception 'profile role cannot be changed by this request';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Who may publish in which sector
-- ---------------------------------------------------------------------------
create or replace function public.can_list_in(p_category text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and (
         p.role = 'admin'
         or (p.role = 'creator' and p_category = 'picha')
         or (p.role = 'provider' and p_category in ('masseuse', 'hookups'))
         or (p.role = 'vendor' and p_category = 'wardrobe')
       )
  );
$$;

revoke execute on function public.can_list_in(text) from public, anon;
grant execute on function public.can_list_in(text) to authenticated;

drop policy if exists "insert own listings" on public.listings;
create policy "insert own listings"
  on public.listings for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_list_in(category));

-- The status comes from the sector, and a provider has one service profile.
create or replace function public.prepare_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires boolean;
begin
  select c.requires_verification
    into v_requires
    from public.categories c
   where c.slug = new.category;

  -- Unknown sectors fail closed as pending.
  new.verification_status :=
    case when v_requires = false then 'approved' else 'pending' end;

  if new.category in ('masseuse', 'hookups')
     and exists (
       select 1
         from public.listings l
        where l.user_id = new.user_id
          and l.category in ('masseuse', 'hookups')
     ) then
    raise exception 'a service provider can have only one Masseuse or Hookups profile';
  end if;

  return new;
end $$;

drop trigger if exists prepare_listing on public.listings;
create trigger prepare_listing
  before insert on public.listings
  for each row execute function public.prepare_listing();

-- ---------------------------------------------------------------------------
-- 3. Profile pictures
-- ---------------------------------------------------------------------------
alter table public.listing_photos drop constraint if exists listing_photos_kind_check;
alter table public.listing_photos add constraint listing_photos_kind_check
  check (kind in ('avatar', 'body', 'face', 'gallery', 'product', 'other'));

-- ---------------------------------------------------------------------------
-- 4. Services and products
-- ---------------------------------------------------------------------------
create table if not exists public.listing_items (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  title text check (title is null or char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) between 1 and 2000),
  price_ugx bigint check (price_ugx is null or price_ugx > 0),
  -- Always in the public 'thumbnails' bucket.
  photo_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists listing_items_listing_idx
  on public.listing_items (listing_id, created_at desc);

-- Products need a name and a price, services need a description.
create or replace function public.check_listing_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category text;
begin
  select l.category into v_category
    from public.listings l
   where l.id = new.listing_id;

  if v_category = 'wardrobe' then
    if new.title is null or new.price_ugx is null then
      raise exception 'a product needs a name and a price';
    end if;
  elsif v_category in ('masseuse', 'hookups') then
    if new.description is null then
      raise exception 'a service needs a description';
    end if;
  else
    raise exception 'this sector does not take services or products';
  end if;

  return new;
end $$;

drop trigger if exists check_listing_item on public.listing_items;
create trigger check_listing_item
  before insert or update on public.listing_items
  for each row execute function public.check_listing_item();

alter table public.listing_items enable row level security;

-- Shown once the profile is approved, always to its owner and admins.
drop policy if exists "read listing items" on public.listing_items;
create policy "read listing items"
  on public.listing_items for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
        from public.listings l
       where l.id = listing_id
         and (l.user_id = auth.uid() or l.verification_status = 'approved')
    )
  );

drop policy if exists "insert own listing items" on public.listing_items;
create policy "insert own listing items"
  on public.listing_items for insert
  to authenticated
  with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  );

drop policy if exists "delete own listing items" on public.listing_items;
create policy "delete own listing items"
  on public.listing_items for delete
  to authenticated
  using (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
    or public.is_admin()
  );

revoke all on public.listing_items from public, anon, authenticated;
grant select on public.listing_items to authenticated;
grant insert (listing_id, title, description, price_ugx, photo_path)
  on public.listing_items to authenticated;
grant delete on public.listing_items to authenticated;

-- Verification: the new role values, the insert policy and the items table.
select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conname in ('profiles_role_check', 'listing_photos_kind_check');

select tablename, policyname
  from pg_policies
 where schemaname = 'public'
   and tablename in ('listings', 'listing_items')
 order by tablename, policyname;
