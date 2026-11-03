-- Access-aware playback.
--
-- The video files live in a private bucket, so the padlock has to be enforced
-- on the file itself and not only in the UI. The previous policy granted read
-- access to anyone with an active subscription, which would have locked the
-- free sectors (picha, wardrobe, masseuse, hookups) behind the paywall.

-- Resolves whether the signed-in user may read a given object in the private
-- `videos` bucket. Mirrors public.isVideoUnlocked in the app.
create or replace function public.can_access_video(p_path text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.videos v
     where v.video_path = p_path
       and (
         v.status = 'published'
         or v.creator_id = auth.uid()
         or public.is_admin()
       )
       and (
         v.creator_id = auth.uid()
         or public.is_admin()
         or public.category_access(v.category) = 'free'
         or public.has_active_subscription()
       )
  );
$$;

revoke execute on function public.can_access_video(text) from public, anon;
grant execute on function public.can_access_video(text) to authenticated;

drop policy if exists "read allowed video files" on storage.objects;
create policy "read allowed video files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'videos' and public.can_access_video(name));

-- Verification: the policy should exist and the function should be callable.
select policyname, cmd
  from pg_policies
 where schemaname = 'storage'
   and tablename = 'objects'
   and policyname = 'read allowed video files';

-- Should be false for a paid category without a subscription, and true for a
-- free category. Run as a signed-in user to see real values.
select
  public.category_access('leaks')    as leaks_access,
  public.category_access('picha')    as picha_access,
  public.category_access('wardrobe') as wardrobe_access;
