-- Admins can manage every listing.
--
-- Until now an admin could approve, edit and delete listings, but not add
-- photos, services or products to someone else's profile, and the
-- one-service-profile rule also applied to admins' own profiles.
--
-- Run AFTER 0021_service_providers.sql.

drop policy if exists "insert own listing photos" on public.listing_photos;
create policy "insert own listing photos"
  on public.listing_photos for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  );

drop policy if exists "insert own listing items" on public.listing_items;
create policy "insert own listing items"
  on public.listing_items for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  );

-- Same as 0021, except that an admin's own profiles skip the one-service rule.
create or replace function public.prepare_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires boolean;
  v_owner_role text;
begin
  select c.requires_verification
    into v_requires
    from public.categories c
   where c.slug = new.category;

  -- Unknown sectors fail closed as pending.
  new.verification_status :=
    case when v_requires = false then 'approved' else 'pending' end;

  select p.role into v_owner_role
    from public.profiles p
   where p.id = new.user_id;

  if new.category in ('masseuse', 'hookups')
     and v_owner_role is distinct from 'admin'
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

-- Verification: both insert policies now allow admins.
select tablename, policyname, with_check
  from pg_policies
 where schemaname = 'public'
   and policyname in ('insert own listing photos', 'insert own listing items')
 order by tablename;
