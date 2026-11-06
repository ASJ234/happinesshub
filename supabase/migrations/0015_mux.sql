-- Mux video hosting.
--
-- New uploads are sent to Mux with a direct upload URL. The browser never
-- proxies the file through the app server, and playback uses signed Mux
-- playback IDs. `video_path` stays in place for databases created before Mux
-- but is no longer used by the app.
--
-- The mux_* columns are written only by trusted server code (the upload API and
-- the Mux webhook use the service-role key), so they are deliberately excluded
-- from the authenticated column grants.

alter table public.videos alter column video_path drop not null;

alter table public.videos add column if not exists mux_asset_id text;
alter table public.videos add column if not exists mux_playback_id text;
alter table public.videos add column if not exists mux_upload_id text;
alter table public.videos add column if not exists mux_status text;
alter table public.videos add column if not exists mux_error text;

do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.videos'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%mux_status%'
  loop
    execute format('alter table public.videos drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.videos
  add constraint videos_mux_status_check
  check (
    mux_status is null
    or mux_status in ('waiting', 'preparing', 'ready', 'errored', 'cancelled')
  );

create unique index if not exists videos_mux_asset_idx
  on public.videos (mux_asset_id) where mux_asset_id is not null;
create unique index if not exists videos_mux_upload_idx
  on public.videos (mux_upload_id) where mux_upload_id is not null;
create index if not exists videos_mux_playback_idx
  on public.videos (mux_playback_id) where mux_playback_id is not null;

-- can_access_video_by_id and record_video_view are defined in 0011_views.sql,
-- which is the canonical source for view-counting logic.

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'videos'
   and column_name like 'mux%'
 order by column_name;

select public.category_access('leaks') as leaks_access,
       public.category_access('picha') as picha_access;
