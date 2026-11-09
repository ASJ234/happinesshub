-- Admin views no longer count.
--
-- Admins watch videos to moderate them, so those plays must not move the view
-- counter or the ledger that drives creator payouts. Every other rule from
-- 0011_views.sql is unchanged.

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

  if public.is_admin() then
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

select proname, pg_get_function_identity_arguments(oid) as arguments
  from pg_proc
 where proname = 'record_video_view';
