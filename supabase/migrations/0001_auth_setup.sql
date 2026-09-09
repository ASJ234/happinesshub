-- HappinessHub auth setup
-- Run this in the Supabase SQL editor once.

-- Usernames are mapped to the synthetic email: <username>@happinesshub.local
-- The app stores profile info in user metadata (username, display_name, role)
-- and mirrors it into public.profiles via a trigger.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  role text not null default 'viewer' check (role in ('viewer', 'creator', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Allow the app roles to use the table (SQL-created tables have no grants by default)
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;

-- Users can read, create, and update their own profile
create policy "select own profile" if not exists on public.profiles
  for select using (auth.uid() = id);

create policy "insert own profile" if not exists on public.profiles
  for insert with check (auth.uid() = id);

create policy "update own profile" if not exists on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), new.id::text),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();