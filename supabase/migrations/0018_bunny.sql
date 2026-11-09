-- Bunny Stream video hosting.
--
-- Regular videos are uploaded to Bunny Stream and played through signed embeds.
-- Mux is now used for live streams only; the mux_* columns on videos are unused.
--
-- The bunny_* columns are written only by trusted server code (the upload API
-- and the Bunny webhook use the service-role key). videos uses column-level
-- insert and update grants, so authenticated users cannot write them.

alter table public.videos add column if not exists bunny_video_id text;
alter table public.videos add column if not exists bunny_status text;
alter table public.videos add column if not exists bunny_error text;

alter table public.videos
  drop constraint if exists videos_bunny_status_check;

alter table public.videos
  add constraint videos_bunny_status_check
  check (
    bunny_status is null
    or bunny_status in ('waiting', 'processing', 'ready', 'errored')
  );

create unique index if not exists videos_bunny_video_idx
  on public.videos (bunny_video_id) where bunny_video_id is not null;

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'videos'
   and column_name like 'bunny%'
 order by column_name;
