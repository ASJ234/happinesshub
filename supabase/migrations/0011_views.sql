-- View counting.
--
-- Rules:
--   * A free viewer counts one view per video per day. The first play of the
--     day counts; every later play that day does not.
--   * A paid (subscribed) viewer counts every play, with no daily cap.
--   * A creator's own views never count.
--
-- `public.videos.views` is the counter shown in the UI and grows on every
-- counted play. `public.video_views` is the ledger used for payouts and holds
-- one row per user, video and day, so a subscriber cannot inflate a creator's
-- earnings by replaying the same video.

create table if not exists public.video_views (
  id bigint generated always as identity primary key,
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  view_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint video_views_daily_unique unique (video_id, user_id, view_date)
);

create index if not exists video_views_video_date_idx
  on public.video_views (video_id, view_date desc);
create index if not exists video_views_user_date_idx
  on public.video_views (user_id, view_date desc);
create index if not exists video_views_date_idx
  on public.video_views (view_date);

alter table public.video_views enable row level security;

drop policy if exists "read own video views" on public.video_views;
create policy "read own video views"
  on public.video_views for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.video_views from anon, authenticated;
grant select on public.video_views to authenticated;

-- Access check by video id. Mirrors public.isVideoUnlocked in the app.
create or replace function public.can_access_video_by_id(p_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.videos v
     where v.id = p_video_id
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

revoke execute on function public.can_access_video_by_id(uuid) from public, anon;
grant execute on function public.can_access_video_by_id(uuid) to authenticated;

-- Records a view and reports whether it moved the counter.
create or replace function public.record_video_view(p_video_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_video public.videos;
  v_unlimited boolean;
  v_inserted boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_video from public.videos where id = p_video_id;
  if not found then
    return false;
  end if;

  -- Never count a creator watching their own upload.
  if v_video.creator_id = auth.uid() then
    return false;
  end if;

  -- Only published videos can be viewed.
  if v_video.status <> 'published' then
    return false;
  end if;

  -- A view only counts when the viewer can actually watch the video. Without
  -- this, a signed-in non-subscriber could call the RPC directly and inflate
  -- the ledger that drives payouts.
  if not public.can_access_video_by_id(v_video.id) then
    return false;
  end if;

  v_unlimited := public.has_active_subscription();

  insert into public.video_views (video_id, user_id, view_date)
  values (p_video_id, auth.uid(), current_date)
  on conflict (video_id, user_id, view_date) do nothing;

  v_inserted := found;

  if v_unlimited or v_inserted then
    update public.videos
       set views = views + 1
     where id = p_video_id;
    return true;
  end if;

  return false;
end $$;

revoke execute on function public.record_video_view(uuid) from public, anon;
grant execute on function public.record_video_view(uuid) to authenticated;

-- Per-video view counts for a creator, used by the analytics page.
create or replace function public.creator_view_counts(
  p_creator_id uuid,
  p_from date,
  p_to date
)
returns table (video_id uuid, title text, views bigint)
language sql
security definer
set search_path = public
as $$
  select v.id, v.title, count(*)::bigint
    from public.video_views vv
    join public.videos v on v.id = vv.video_id
   where v.creator_id = p_creator_id
     and vv.view_date between p_from and p_to
   group by v.id, v.title
   order by count(*) desc;
$$;

revoke execute on function public.creator_view_counts(uuid, date, date) from public, anon;
grant execute on function public.creator_view_counts(uuid, date, date) to authenticated;

-- Verification: the ledger should stay empty until videos are watched.
select count(*) as ledger_rows from public.video_views;

select
  public.category_access('leaks') as leaks_access,
  public.category_access('picha') as picha_access;
