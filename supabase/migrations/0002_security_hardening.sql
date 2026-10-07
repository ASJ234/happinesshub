-- HappinessHub security hardening
-- Idempotent: safe to run more than once. Run AFTER 0001_auth_setup.sql,
-- in the Supabase SQL editor (or with the supabase CLI).
--
-- Fixes:
--   1. Authenticated users could overwrite their own profile row, including
--      the admin-managed `role` column (privilege escalation).
--      (The app also no longer reads role from user_metadata, which users can
--      edit themselves with auth.updateUser().)
--   2. handle_new_user trusted the client's signup metadata for `role`, so a
--      direct call to /auth/v1/signup with role: "admin" created an admin.

-- ---------------------------------------------------------------------------
-- 1. Column-level grants.
--    Table-level INSERT/UPDATE are revoked first: column grants are additive
--    with a table grant, so the broad grant has to go before the narrow one.
--    Result: users may write only their own display_name. username is the
--    login identity and role is admin-managed.
-- ---------------------------------------------------------------------------
revoke insert, update on public.profiles from authenticated;
grant insert (id, username, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Defense in depth: reject role changes coming from a end-user JWT.
--    The SQL editor (no JWT claims) and service_role are still allowed, so
--    admin promotions keep working:
--      update public.profiles set role = 'creator' where username = '...';
-- ---------------------------------------------------------------------------
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
    raise exception 'profile role cannot be changed by this request';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- 3. New accounts always start as "viewer", whatever the client sent.
--    Promotion is an admin action on public.profiles.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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

  return new;
end;
$$;
