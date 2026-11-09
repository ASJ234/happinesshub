-- Video comments.
--
-- Rules:
--   * Anyone who can watch a published video can comment on it.
--   * Replies are one level deep.
--   * The video's creator and admins can hide comments and see hidden ones.
--   * Authors, the video's creator and admins can delete a comment.
--
-- The table has no direct grants. Everything goes through the functions below,
-- which expose only an author's display name, never their profile.

create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.video_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists video_comments_video_idx
  on public.video_comments (video_id, created_at desc);
create index if not exists video_comments_parent_idx
  on public.video_comments (parent_id) where parent_id is not null;

alter table public.video_comments enable row level security;
revoke all on public.video_comments from public, anon, authenticated;

create or replace function public.can_moderate_video(p_video_id uuid)
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
       and (v.creator_id = auth.uid() or public.is_admin())
  );
$$;

revoke execute on function public.can_moderate_video(uuid) from public, anon;
grant execute on function public.can_moderate_video(uuid) to authenticated;

create or replace function public.add_video_comment(
  p_video_id uuid,
  p_body text,
  p_parent_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if char_length(v_body) not between 1 and 1000 then
    raise exception 'Comments must be between 1 and 1000 characters';
  end if;

  if not exists (
    select 1 from public.videos where id = p_video_id and status = 'published'
  ) or not public.can_access_video_by_id(p_video_id) then
    raise exception 'You cannot comment on this video';
  end if;

  if p_parent_id is not null and not exists (
    select 1
      from public.video_comments
     where id = p_parent_id
       and video_id = p_video_id
       and parent_id is null
       and not hidden
  ) then
    raise exception 'You cannot reply to this comment';
  end if;

  insert into public.video_comments (video_id, user_id, parent_id, body)
  values (p_video_id, auth.uid(), p_parent_id, v_body)
  returning id into v_id;

  return v_id;
end $$;

revoke execute on function public.add_video_comment(uuid, text, uuid) from public, anon;
grant execute on function public.add_video_comment(uuid, text, uuid) to authenticated;

-- Pass a video id for that video's thread, or null for every comment on the
-- videos the caller can moderate.
create or replace function public.list_video_comments(p_video_id uuid default null)
returns table (
  id uuid,
  video_id uuid,
  video_title text,
  parent_id uuid,
  body text,
  hidden boolean,
  created_at timestamptz,
  author_name text,
  can_moderate boolean,
  can_delete boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id,
         c.video_id,
         v.title,
         c.parent_id,
         c.body,
         c.hidden,
         c.created_at,
         coalesce(nullif(p.display_name, ''), p.username, 'User'),
         m.can_moderate,
         m.can_moderate or c.user_id = auth.uid()
    from public.video_comments c
    join public.videos v on v.id = c.video_id
    left join public.profiles p on p.id = c.user_id
    left join public.video_comments parent on parent.id = c.parent_id
   cross join lateral (
     select public.can_moderate_video(c.video_id) as can_moderate
   ) m
   where case
           when p_video_id is null then m.can_moderate
           else c.video_id = p_video_id
                and public.can_access_video_by_id(c.video_id)
                and (
                  m.can_moderate
                  or (not c.hidden and not coalesce(parent.hidden, false))
                )
         end
   order by c.created_at desc
   limit 300;
$$;

revoke execute on function public.list_video_comments(uuid) from public, anon;
grant execute on function public.list_video_comments(uuid) to authenticated;

create or replace function public.set_video_comment_hidden(
  p_id uuid,
  p_hidden boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_video_id uuid;
begin
  select video_id into v_video_id from public.video_comments where id = p_id;

  if v_video_id is null or not public.can_moderate_video(v_video_id) then
    raise exception 'You cannot moderate this comment';
  end if;

  update public.video_comments set hidden = p_hidden where id = p_id;
end $$;

revoke execute on function public.set_video_comment_hidden(uuid, boolean) from public, anon;
grant execute on function public.set_video_comment_hidden(uuid, boolean) to authenticated;

create or replace function public.delete_video_comment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comment public.video_comments;
begin
  select * into v_comment from public.video_comments where id = p_id;

  if not found or not (
    v_comment.user_id = auth.uid()
    or public.can_moderate_video(v_comment.video_id)
  ) then
    raise exception 'You cannot delete this comment';
  end if;

  delete from public.video_comments where id = p_id;
end $$;

revoke execute on function public.delete_video_comment(uuid) from public, anon;
grant execute on function public.delete_video_comment(uuid) to authenticated;

select proname, pg_get_function_identity_arguments(oid) as arguments
  from pg_proc
 where proname in (
   'can_moderate_video', 'add_video_comment', 'list_video_comments',
   'set_video_comment_hidden', 'delete_video_comment'
 )
 order by proname;
