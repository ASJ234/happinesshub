-- Scope the legacy RLS policies to signed-in users.
--
-- Why this is needed:
--   public.is_admin() is a STABLE function, so PostgreSQL evaluates it once as
--   an InitPlan instead of once per row. Because the `anon` role has no
--   EXECUTE privilege on it, EVERY read of public.videos and
--   public.subscriptions as an anonymous visitor failed with
--   "permission denied for function is_admin" (SQLSTATE 42501) — even for
--   rows the policy would have allowed.
--
--   The policies created in 0007-0013 are all written `to authenticated`.
--   This migration brings the older 0003 policies in line with them, so an
--   anonymous visitor is cleanly denied instead of hitting a database error.
--
-- Run AFTER 0003_content_and_payments.sql.

-- ---------------------------------------------------------------------------
-- videos
-- ---------------------------------------------------------------------------
drop policy if exists "select visible videos" on public.videos;
create policy "select visible videos"
  on public.videos for select
  to authenticated
  using (status = 'published' or creator_id = auth.uid() or public.is_admin());

drop policy if exists "insert own videos" on public.videos;
create policy "insert own videos"
  on public.videos for insert
  to authenticated
  with check (creator_id = auth.uid() and public.is_creator());

drop policy if exists "update own videos" on public.videos;
create policy "update own videos"
  on public.videos for update
  to authenticated
  using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid() or public.is_admin());

drop policy if exists "delete own videos" on public.videos;
create policy "delete own videos"
  on public.videos for delete
  to authenticated
  using (creator_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
drop policy if exists "select own subscriptions" on public.subscriptions;
create policy "select own subscriptions"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "admin selects all subscriptions" on public.subscriptions;
create policy "admin selects all subscriptions"
  on public.subscriptions for select
  to authenticated
  using (public.is_admin());

drop policy if exists "submit own pending subscription" on public.subscriptions;
create policy "submit own pending subscription"
  on public.subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

-- ---------------------------------------------------------------------------
-- profiles and payment settings
-- ---------------------------------------------------------------------------
drop policy if exists "admin selects all profiles" on public.profiles;
create policy "admin selects all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admin updates all profiles" on public.profiles;
create policy "admin updates all profiles"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin updates payment settings" on public.payment_settings;
create policy "admin updates payment settings"
  on public.payment_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: the admin branches of the write policies call is_admin() too.
-- ---------------------------------------------------------------------------
drop policy if exists "delete own video files" on storage.objects;
create policy "delete own video files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'videos' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "delete own thumbnails" on storage.objects;
create policy "delete own thumbnails"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'thumbnails' and (owner = auth.uid() or public.is_admin()));

-- Verification: no policy may call is_admin() outside the authenticated role.
select schemaname, tablename, policyname, roles::text
  from pg_policies
 where schemaname in ('public', 'storage')
   and policyname in (
     'select visible videos', 'insert own videos', 'update own videos',
     'delete own videos', 'select own subscriptions',
     'admin selects all subscriptions', 'submit own pending subscription',
     'admin selects all profiles', 'admin updates all profiles',
     'admin updates payment settings', 'delete own video files',
     'delete own thumbnails'
   )
 order by tablename, policyname;
