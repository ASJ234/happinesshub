-- Lets an admin revoke an active subscription, e.g. one activated by
-- mistake. The padlocks close immediately: has_active_subscription() only
-- counts status 'active'. The row is kept, marked 'revoked', so the history
-- stays readable.

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('pending', 'active', 'rejected', 'failed', 'revoked'));

create or replace function public.admin_revoke_subscription(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;

  update public.subscriptions
     set status = 'revoked',
         expires_at = now(),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_id
     and status = 'active';

  if not found then
    raise exception 'active subscription not found';
  end if;
end;
$$;

revoke execute on function public.admin_revoke_subscription(uuid) from public, anon;
grant execute on function public.admin_revoke_subscription(uuid) to authenticated;

-- Verification
select proname from pg_proc where proname = 'admin_review_subscription' or proname = 'admin_revoke_subscription';
