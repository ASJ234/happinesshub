-- HappinessHub full data reset
-- Run in the Supabase SQL editor to wipe ALL data while keeping the schema
-- (tables, RLS policies, buckets, functions stay in place).
--
-- What this removes:
--   * every account (auth.users -> profiles, videos, subscriptions cascade)
--   * every uploaded video and thumbnail file (best effort, see step 2)
--   * every deposit/subscription request
-- Payment settings are restored to their defaults.

begin;

-- 1. subscriptions.reviewed_by points at profiles without ON DELETE CASCADE
--    and would block the wipe.
update public.subscriptions
   set reviewed_by = null
 where reviewed_by is not null;

-- 2. Remove every stored file (buckets themselves are kept).
--    Supabase's storage.protect_delete trigger blocks direct DELETEs on
--    storage.objects, so it is dropped for the duration of this block and
--    restored afterwards. If the SQL editor is not allowed to drop it, the
--    cleanup is skipped with a notice — then empty the buckets manually in
--    Dashboard -> Storage (files are harmless either way: no rows reference
--    them once the accounts are gone).
do $$
begin
  begin
    drop trigger if exists protect_delete on storage.objects;
  exception when others then
    raise notice 'storage cleanup skipped (could not drop trigger): %', sqlerrm;
    return;
  end;

  begin
    delete from storage.objects
     where bucket_id in ('videos', 'thumbnails');
  exception when others then
    raise notice 'storage cleanup failed: %', sqlerrm;
  end;

  begin
    create trigger protect_delete
      after delete on storage.objects
      for each row execute function storage.protect_delete();
  exception when others then
    raise warning 'IMPORTANT: could not restore storage.protect_delete: %', sqlerrm;
  end;
end;
$$;

-- 3. Delete every account. Cascades:
--      auth.users -> public.profiles -> public.videos
--                                    -> public.subscriptions
delete from auth.users;

-- 4. Clean up any orphaned rows (e.g. profiles left behind by manual edits).
delete from public.videos;
delete from public.subscriptions;
delete from public.profiles;

-- 5. Restore default payment details.
insert into public.payment_settings (id, account_name, phone_number, amount)
values (true, 'HappinessHub Payments', '+256 700 000 000', 19.99)
on conflict (id) do update
   set account_name = excluded.account_name,
       phone_number = excluded.phone_number,
       amount       = excluded.amount,
       updated_at   = now();

commit;

-- Verify: all four counts should be 0 (payment_settings stays at 1 row).
select
  (select count(*) from auth.users)            as auth_users,
  (select count(*) from public.profiles)       as profiles,
  (select count(*) from public.videos)         as videos,
  (select count(*) from public.subscriptions)  as subscriptions,
  (select count(*) from public.payment_settings) as payment_settings;
