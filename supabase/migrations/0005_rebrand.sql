-- Happyporn.com rebrand.
--
-- Run this migration BEFORE deploying the app that signs users in with
-- <username>@happyporn.local. If the app ships first, every existing account
-- will fail to sign in with "Incorrect username or password" because the
-- synthetic email no longer matches what is stored in auth.users.

-- 1. Re-point existing auth users at the new synthetic domain. The mapping is
--    1:1 (only the domain part changes), so the unique index on email holds.
update auth.users
   set email = replace(email, '@happinesshub.local', '@happyporn.local')
 where email like '%@happinesshub.local';

-- 2. Rebrand the default payment account label. The seeded row keeps whatever
--    the admin last typed, so only the untouched default is updated here.
alter table public.payment_settings
  alter column account_name set default 'Happyporn Payments';

update public.payment_settings
   set account_name = 'Happyporn Payments'
 where account_name = 'HappinessHub Payments';

-- 3. Verification: should return zero rows once the migration has been applied.
select id, email
  from auth.users
 where email like '%@happinesshub.local'
    or email like '%@happyporn.local'
 order by email;
