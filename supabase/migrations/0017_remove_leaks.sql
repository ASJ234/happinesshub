-- Removes the Leaks sector.
--
-- Any video still filed under it is deleted, not moved to another sector.

delete from public.videos where category = 'leaks';

alter table public.videos
  drop constraint if exists videos_category_check;

alter table public.videos
  add constraint videos_category_check
  check (category in ('ugandan', 'appetizers', 'quickies', 'live', 'explore'));

delete from public.categories where slug = 'leaks';

select slug, label, kind, access
  from public.categories
 order by sort_order;
