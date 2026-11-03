-- Category model for the ten HAPPYPORN.COM sectors.
--
-- Six video sectors (public.videos.category) and four listing sectors
-- (public.listings.category, created in a later migration):
--
--   picha        Pictures                        listing  free
--   leaks        Celebrity leaked videos         video    paid
--   wardrobe     Merchants selling sex toys      listing  free
--   ugandan      Exclusively Ugandan videos      video    paid
--   appetizers   Appetizing 9:16 videos          video    paid
--   quickies     Short 9:16 videos               video    paid
--   masseuse     Massage ladies to hire         listing  free
--   hookups      Companions available to book    listing  free
--   live         Live streams and recordings     video    paid
--   explore      Every video on the platform     video    paid

create table if not exists public.categories (
  slug text primary key,
  label text not null,
  description text not null default '',
  kind text not null check (kind in ('video', 'listing')),
  access text not null check (access in ('free', 'paid')),
  -- Required aspect ratio for uploads, e.g. '9:16'. Null means unconstrained.
  aspect text check (aspect is null or aspect in ('9:16')),
  -- Maximum upload duration in seconds. Null means unconstrained.
  max_seconds integer check (max_seconds is null or max_seconds > 0),
  requires_verification boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

insert into public.categories
  (slug, label, description, kind, access, aspect, max_seconds, requires_verification, sort_order)
values
  ('picha',       'Picha',               'Photo galleries and picture collections',                 'listing', 'free', null, null, false, 10),
  ('leaks',       'Leaks',               'The latest celebrity leaked videos',                       'video',   'paid', null, null, false, 20),
  ('wardrobe',    'Wardrobe',            'Merchants selling sex toys',                               'listing', 'free', null, null, false, 30),
  ('ugandan',     'Exclusively Ugandan', 'Only Ugandan-made videos',                                'video',   'paid', null, null, false, 40),
  ('appetizers',  'Appetizers',          'Appetizing vertical videos',                              'video',   'paid', '9:16', 300, false, 50),
  ('quickies',    'Quickies',            'Short vertical videos',                                   'video',   'paid', '9:16', 120, false, 60),
  ('masseuse',    'Masseuse',            'Massage ladies available to hire',                        'listing', 'free', null, null, true,  70),
  ('hookups',     'Hookups',             'Companions available to book',                            'listing', 'free', null, null, true,  80),
  ('live',        'Live',                'Live streams and their recordings',                       'video',   'paid', null, null, false, 90),
  ('explore',     'Explore',             'Every video on the platform',                             'video',   'paid', null, null, false, 100)
on conflict (slug) do update set
  label               = excluded.label,
  description         = excluded.description,
  kind                = excluded.kind,
  access              = excluded.access,
  aspect              = excluded.aspect,
  max_seconds         = excluded.max_seconds,
  requires_verification = excluded.requires_verification,
  sort_order          = excluded.sort_order;

alter table public.categories enable row level security;

drop policy if exists "read categories" on public.categories;
create policy "read categories"
  on public.categories for select
  to authenticated
  using (true);

drop policy if exists "admin writes categories" on public.categories;
create policy "admin writes categories"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke insert, update, delete on public.categories from anon, authenticated;
grant select on public.categories to authenticated;
grant insert, update, delete on public.categories to authenticated;

-- Fail-closed category lookups. An unknown slug is treated as paid video, so a
-- missing row can never accidentally hand out free access.
create or replace function public.category_access(p_slug text)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce((select access from public.categories where slug = p_slug), 'paid');
$$;

create or replace function public.category_kind(p_slug text)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce((select kind from public.categories where slug = p_slug), 'video');
$$;

grant execute on function public.category_access(text) to authenticated;
grant execute on function public.category_kind(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Move existing videos onto the new slugs before the check constraint changes.
-- ---------------------------------------------------------------------------
update public.videos set category = 'leaks'   where category = 'celebrity-leaks';
update public.videos set category = 'live'    where category = 'live-sex';
update public.videos set category = 'explore' where category = 'hookup-corner';
update public.videos set category = 'explore' where category = 'picha';

-- Drop every check constraint on videos.category that still mentions an old
-- slug, whatever Postgres auto-named it.
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.videos'::regclass
       and contype = 'c'
       and (
         pg_get_constraintdef(oid) like '%celebrity-leaks%'
         or pg_get_constraintdef(oid) like '%hookup-corner%'
         or pg_get_constraintdef(oid) like '%live-sex%'
       )
  loop
    execute format('alter table public.videos drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.videos
  drop constraint if exists videos_category_check;

alter table public.videos
  add constraint videos_category_check
  check (category in ('leaks', 'ugandan', 'appetizers', 'quickies', 'live', 'explore'));

-- ---------------------------------------------------------------------------
-- Upload metadata needed to enforce the 9:16 rule for Appetizers / Quickies.
-- ---------------------------------------------------------------------------
alter table public.videos add column if not exists width integer;
alter table public.videos add column if not exists height integer;
alter table public.videos add column if not exists duration_seconds integer;
alter table public.videos add column if not exists aspect text;

-- Creators must be able to write their own upload metadata.
revoke update on public.videos from authenticated;
grant update (title, description, category, status, thumbnail_path, width, height, duration_seconds, aspect)
  on public.videos to authenticated;
grant insert (creator_id, title, description, category, video_path, thumbnail_path, status, width, height, duration_seconds, aspect)
  on public.videos to authenticated;

-- Verification: ten sectors, six of them video categories.
select slug, label, kind, access, aspect, max_seconds, requires_verification
  from public.categories
 order by sort_order;

select category, count(*)
  from public.videos
 group by category
 order by category;
