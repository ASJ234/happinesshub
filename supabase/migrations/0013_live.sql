-- Live streams, chat, gifts and gift deposits.
--
-- Rules:
--   * Going live is only allowed on the weekdays listed in
--     public.app_settings.live_allowed_weekdays (default Wednesday, Friday,
--     Saturday and Sunday — Monday, Tuesday and Thursday are blocked).
--   * A creator requests a stream, an admin approves it, and the creator
--     starts it inside an allowed day.
--   * Chat runs over Supabase Realtime.
--   * Gifts are bought with gift credit, which is topped up with the same
--     manual-deposit + admin-approval flow as the subscription.

-- ---------------------------------------------------------------------------
-- 1. live_streams
-- ---------------------------------------------------------------------------
create table if not exists public.live_streams (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'live', 'ended')),
  provider text not null default 'local',
  provider_session_id text,
  scheduled_for timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  viewers integer not null default 0 check (viewers >= 0),
  gift_total numeric not null default 0 check (gift_total >= 0),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index if not exists live_streams_creator_idx
  on public.live_streams (creator_id, created_at desc);
create index if not exists live_streams_status_idx
  on public.live_streams (status, created_at desc);

alter table public.live_streams enable row level security;

grant select on public.live_streams to authenticated;
revoke insert, update, delete on public.live_streams from anon, authenticated;

drop policy if exists "read visible live streams" on public.live_streams;
create policy "read visible live streams"
  on public.live_streams for select
  to authenticated
  using (status in ('approved', 'live', 'ended') or creator_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. live_chat_messages
-- ---------------------------------------------------------------------------
create table if not exists public.live_chat_messages (
  id bigint generated always as identity primary key,
  stream_id uuid not null references public.live_streams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists live_chat_stream_idx
  on public.live_chat_messages (stream_id, id);

alter table public.live_chat_messages enable row level security;

grant select, insert on public.live_chat_messages to authenticated;
revoke update, delete on public.live_chat_messages from anon, authenticated;
grant update (deleted) on public.live_chat_messages to authenticated;

drop policy if exists "read live chat" on public.live_chat_messages;
create policy "read live chat"
  on public.live_chat_messages for select
  to authenticated
  using (true);

drop policy if exists "post live chat" on public.live_chat_messages;
create policy "post live chat"
  on public.live_chat_messages for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "moderate live chat" on public.live_chat_messages;
create policy "moderate live chat"
  on public.live_chat_messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Realtime: chat rows are pushed to the browsers watching a stream.
-- live_gift_sends is added to the publication further down, after its table
-- exists.
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'live_chat_messages'
  ) then
    alter publication supabase_realtime add table public.live_chat_messages;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. live_gifts — the catalogue admins manage.
-- ---------------------------------------------------------------------------
create table if not exists public.live_gifts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  emoji text not null default '🎁',
  price numeric not null check (price > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.live_gifts (slug, name, emoji, price, sort_order) values
  ('rose', 'Rose', '🌹', 1, 10),
  ('heart', 'Heart', '❤️', 2, 20),
  ('kiss', 'Kiss', '💋', 5, 30),
  ('champagne', 'Champagne', '🍾', 10, 40),
  ('diamond', 'Diamond', '💎', 20, 50),
  ('crown', 'Crown', '👑', 50, 60),
  ('rocket', 'Rocket', '🚀', 100, 70)
on conflict (slug) do update
  set name = excluded.name,
      emoji = excluded.emoji,
      price = excluded.price,
      sort_order = excluded.sort_order;

alter table public.live_gifts enable row level security;

grant select on public.live_gifts to authenticated;
revoke insert, update, delete on public.live_gifts from anon, authenticated;

drop policy if exists "read live gifts" on public.live_gifts;
create policy "read live gifts"
  on public.live_gifts for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 4. gift_deposits — manual top-ups awaiting an admin.
-- ---------------------------------------------------------------------------
create table if not exists public.gift_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null check (amount > 0),
  paid_from text not null,
  reference text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists gift_deposits_one_pending
  on public.gift_deposits (user_id) where status = 'pending';
create index if not exists gift_deposits_status_idx
  on public.gift_deposits (status, created_at desc);

alter table public.gift_deposits enable row level security;

grant select, insert on public.gift_deposits to authenticated;
revoke update, delete on public.gift_deposits from anon, authenticated;

drop policy if exists "read own gift deposits" on public.gift_deposits;
create policy "read own gift deposits"
  on public.gift_deposits for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "submit own gift deposit" on public.gift_deposits;
create policy "submit own gift deposit"
  on public.gift_deposits for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- ---------------------------------------------------------------------------
-- 5. live_gift_sends
-- ---------------------------------------------------------------------------
create table if not exists public.live_gift_sends (
  id bigint generated always as identity primary key,
  stream_id uuid not null references public.live_streams (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  gift_id uuid not null references public.live_gifts (id),
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists live_gift_sends_stream_idx
  on public.live_gift_sends (stream_id, id desc);
create index if not exists live_gift_sends_sender_idx
  on public.live_gift_sends (sender_id, id desc);

alter table public.live_gift_sends enable row level security;

grant select on public.live_gift_sends to authenticated;
revoke insert, update, delete on public.live_gift_sends from anon, authenticated;

drop policy if exists "read live gift sends" on public.live_gift_sends;
create policy "read live gift sends"
  on public.live_gift_sends for select
  to authenticated
  using (true);

-- Realtime: gift sends are pushed to the browser watching the stream.
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'live_gift_sends'
  ) then
    alter publication supabase_realtime add table public.live_gift_sends;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. The day rule
-- ---------------------------------------------------------------------------
create or replace function public.can_go_live_on(p_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select extract(isodow from p_date)::int = any (
    coalesce(
      (select live_allowed_weekdays from public.app_settings where id = true),
      '{3,5,6,7}'::int[]
    )
  );
$$;

create or replace function public.can_go_live_today()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_go_live_on(current_date);
$$;

revoke execute on function public.can_go_live_on(date) from public, anon;
revoke execute on function public.can_go_live_today() from public, anon;
grant execute on function public.can_go_live_on(date) to authenticated;
grant execute on function public.can_go_live_today() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. The live workflow
-- ---------------------------------------------------------------------------
create or replace function public.request_live_stream(
  p_title text,
  p_description text,
  p_scheduled_for timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid := auth.uid();
  v_stream uuid;
begin
  if v_creator is null then
    raise exception 'sign in required';
  end if;

  if not public.is_creator() then
    raise exception 'only creators can go live';
  end if;

  if p_title is null or length(trim(p_title)) < 1 then
    raise exception 'a title is required';
  end if;

  if p_scheduled_for is not null
     and not public.can_go_live_on(p_scheduled_for::date) then
    raise exception 'going live is not allowed on that day';
  end if;

  insert into public.live_streams (creator_id, title, description, scheduled_for)
  values (v_creator, trim(p_title), nullif(trim(coalesce(p_description, '')), ''), p_scheduled_for)
  returning id into v_stream;

  return v_stream;
end;
$$;

revoke execute on function public.request_live_stream(text, text, timestamptz) from public, anon;
grant execute on function public.request_live_stream(text, text, timestamptz) to authenticated;

create or replace function public.admin_review_live_stream(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  update public.live_streams
     set status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_id and status = 'pending';

  if not found then
    raise exception 'pending request not found';
  end if;
end;
$$;

revoke execute on function public.admin_review_live_stream(uuid, text) from public, anon;
grant execute on function public.admin_review_live_stream(uuid, text) to authenticated;

create or replace function public.start_live_stream(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_creator() then
    raise exception 'only creators can go live';
  end if;

  if not public.can_go_live_today() then
    raise exception 'going live is not allowed today';
  end if;

  update public.live_streams
     set status = 'live',
         started_at = now(),
         ended_at = null
   where id = p_id
     and creator_id = auth.uid()
     and status = 'approved';

  if not found then
    raise exception 'approved stream not found';
  end if;
end;
$$;

revoke execute on function public.start_live_stream(uuid) from public, anon;
grant execute on function public.start_live_stream(uuid) to authenticated;

create or replace function public.end_live_stream(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_streams
     set status = 'ended',
         ended_at = now()
   where id = p_id
     and (creator_id = auth.uid() or public.is_admin())
     and status = 'live';

  if not found then
    raise exception 'live stream not found';
  end if;
end;
$$;

revoke execute on function public.end_live_stream(uuid) from public, anon;
grant execute on function public.end_live_stream(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Gift credit and sending
-- ---------------------------------------------------------------------------
create or replace function public.gift_balance()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select sum(amount) from public.gift_deposits
                    where user_id = auth.uid() and status = 'approved'), 0)
       - coalesce((select sum(amount) from public.live_gift_sends
                    where sender_id = auth.uid()), 0);
$$;

revoke execute on function public.gift_balance() from public, anon;
grant execute on function public.gift_balance() to authenticated;

create or replace function public.admin_review_gift_deposit(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  update public.gift_deposits
     set status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_id and status = 'pending';

  if not found then
    raise exception 'pending request not found';
  end if;
end;
$$;

revoke execute on function public.admin_review_gift_deposit(uuid, text) from public, anon;
grant execute on function public.admin_review_gift_deposit(uuid, text) to authenticated;

create or replace function public.send_live_gift(p_stream_id uuid, p_gift_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_gift public.live_gifts;
  v_stream public.live_streams;
  v_balance numeric;
  v_send_id bigint;
begin
  if v_sender is null then
    raise exception 'sign in required';
  end if;

  select * into v_gift from public.live_gifts where id = p_gift_id and active;
  if not found then
    raise exception 'gift not available';
  end if;

  select * into v_stream from public.live_streams where id = p_stream_id;
  if not found then
    raise exception 'stream not found';
  end if;
  if v_stream.status <> 'live' then
    raise exception 'the stream is not live';
  end if;
  if v_stream.creator_id = v_sender then
    raise exception 'you cannot send a gift to your own stream';
  end if;

  v_balance := public.gift_balance();
  if v_balance < v_gift.price then
    raise exception 'not enough gift credit';
  end if;

  insert into public.live_gift_sends (stream_id, sender_id, gift_id, amount)
  values (p_stream_id, v_sender, p_gift_id, v_gift.price)
  returning id into v_send_id;

  update public.live_streams
     set gift_total = gift_total + v_gift.price
   where id = p_stream_id;

  -- Gift income is credited to the creator's wallet right away and stays
  -- separate from the monthly views pool.
  insert into public.wallet_transactions (user_id, kind, amount, reference, note)
  values (v_stream.creator_id, 'gift', v_gift.price, v_send_id::text, v_gift.name);

  return v_send_id;
end;
$$;

revoke execute on function public.send_live_gift(uuid, uuid) from public, anon;
grant execute on function public.send_live_gift(uuid, uuid) to authenticated;

-- Verification: the day rule and the gift catalogue.
select public.can_go_live_today() as can_go_live_today,
       (select live_allowed_weekdays from public.app_settings where id = true) as allowed_days;

select slug, name, emoji, price from public.live_gifts order by sort_order;
