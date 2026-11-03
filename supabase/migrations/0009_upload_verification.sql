-- Upload verification.
--
-- Every video a creator uploads is held for review until an admin approves it.
-- An admin can exempt a creator from verification, in which case their
-- uploads publish immediately. Exempting is reversible: lifting the exemption
-- puts the creator back under review.

alter table public.profiles
  add column if not exists verification_exempted boolean not null default false;
alter table public.profiles
  add column if not exists verification_exempted_by uuid references public.profiles(id) on delete set null;
alter table public.profiles
  add column if not exists verification_exempted_at timestamptz;

-- Videos gain the two review states plus the reviewer's trail.
alter table public.videos add column if not exists review_note text;
alter table public.videos add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.videos add column if not exists reviewed_at timestamptz;

-- Drop every check constraint on videos.status that predates the new states,
-- whatever Postgres auto-named it.
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.videos'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%scheduled%'
  loop
    execute format('alter table public.videos drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.videos
  drop constraint if exists videos_status_check;

alter table public.videos
  add constraint videos_status_check
  check (status in ('published', 'draft', 'scheduled', 'pending_review', 'rejected'));

-- Only the review columns are writable by admins; creators keep writing their
-- own metadata.
revoke update on public.videos from authenticated;
grant update (title, description, category, status, thumbnail_path, width, height, duration_seconds, aspect)
  on public.videos to authenticated;

-- ---------------------------------------------------------------------------
-- Admin actions
-- ---------------------------------------------------------------------------

-- Approve or reject a video that is waiting for review.
create or replace function public.admin_review_video(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  if p_status not in ('published', 'rejected', 'pending_review') then
    raise exception 'invalid status';
  end if;

  update public.videos
     set status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_id;

  if not found then
    raise exception 'video not found';
  end if;
end $$;

revoke execute on function public.admin_review_video(uuid, text) from public, anon;
grant execute on function public.admin_review_video(uuid, text) to authenticated;

-- Exempt a creator from upload verification, or put them back under review.
-- This runs as a definer function so that the column itself never has to be
-- writable by regular users.
create or replace function public.admin_set_verification_exemption(
  p_user_id uuid,
  p_exempt boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  if p_exempt then
    update public.profiles
       set verification_exempted = true,
           verification_exempted_by = auth.uid(),
           verification_exempted_at = now()
     where id = p_user_id;
  else
    update public.profiles
       set verification_exempted = false,
           verification_exempted_by = auth.uid(),
           verification_exempted_at = now()
     where id = p_user_id;
  end if;

  if not found then
    raise exception 'user not found';
  end if;
end $$;

revoke execute on function public.admin_set_verification_exemption(uuid, boolean) from public, anon;
grant execute on function public.admin_set_verification_exemption(uuid, boolean) to authenticated;

-- Verification: three review states and the exemption columns.
select status, count(*)
  from public.videos
 group by status
 order by status;

select count(*) as exempt_creators
  from public.profiles
 where verification_exempted;
