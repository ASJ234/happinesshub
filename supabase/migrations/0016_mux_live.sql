-- Mux live streaming.
--
-- Adds Mux-specific columns to live_streams. The stream key is sensitive
-- (it allows anyone to broadcast to the channel) so it is written only via
-- the service-role key and readable only through the security-definer
-- function below.
--
-- mux_live_stream_id  — Mux live stream resource ID, used to complete/delete.
-- mux_playback_id     — Signed playback ID shown to viewers (token still needed).
-- mux_stream_key      — RTMP stream key shown only to the creator/admin.

alter table public.live_streams
  add column if not exists mux_live_stream_id text,
  add column if not exists mux_playback_id     text,
  add column if not exists mux_stream_key      text;

create unique index if not exists live_streams_mux_live_id_idx
  on public.live_streams (mux_live_stream_id)
  where mux_live_stream_id is not null;

-- ---------------------------------------------------------------------------
-- Stream key access — only the creator or an admin may read it.
-- ---------------------------------------------------------------------------
create or replace function public.get_live_stream_key(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_stream public.live_streams;
begin
  select * into v_stream from public.live_streams where id = p_id;
  if not found then return null; end if;
  if v_stream.creator_id <> auth.uid() and not public.is_admin() then
    return null;
  end if;
  return v_stream.mux_stream_key;
end;
$$;

revoke execute on function public.get_live_stream_key(uuid) from public, anon;
grant execute on function public.get_live_stream_key(uuid) to authenticated;

-- Verification
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'live_streams'
   and column_name like 'mux%'
 order by column_name;
