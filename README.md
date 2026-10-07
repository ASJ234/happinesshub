# HappinessHub

Adult content platform built with Next.js (App Router) and Supabase.

## Stack

- **Next.js 16** (App Router, TypeScript, React 19)
- **Tailwind CSS v4** — CSS-first config in `src/app/globals.css` (no `tailwind.config.*`)
- **Supabase** — `@supabase/ssr` for cookie-based auth
- **lucide-react** icons

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts: `npm run build`, `npm start`, `npm run lint`.

### Environment

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback for the publishable key.

### Database

The migrations in `supabase/migrations/` are meant to be run **in order** in the
Supabase SQL editor (or via `supabase db push`):

1. `0001_auth_setup.sql` — `public.profiles` table, RLS policies, and the
   `handle_new_user` trigger.
2. `0002_security_hardening.sql` — column-level grants (users can only write
   their own `display_name`), a trigger that blocks user-driven `role`
   changes, and a `handle_new_user` that always creates accounts as `viewer`.
3. `0003_content_and_payments.sql` — `videos`, `subscriptions`, and
   `payment_settings` tables with RLS, the `videos`/`thumbnails` storage
   buckets, admin RPCs (`admin_review_subscription`, `admin_delete_user`),
   and the role rules for admin edits + "become a creator" self-upgrade.
4. `0004_subscription_plans.sql` — the four billing plans, `plan_id` +
   `expires_at` on subscriptions, expiry-aware access, and plan-based expiry
   stamped on approval.

> The app fails closed: if the `profiles` table is missing, every user is
> treated as a `viewer` and a warning is logged.

## Auth model

- Users sign up with a **username**, which is mapped to the synthetic email
  `<username>@happinesshub.local` (`src/lib/auth.ts`).
- **Role lives only in `public.profiles.role`** and is read server-side by
  `getCurrentUser()`. It is never read from `user_metadata`, which the
  signed-in user can edit themselves.
- New accounts are always `viewer`. A viewer may upgrade **only themselves**
  to `creator` (Settings → "Become a Creator"); any other role change is an
  admin action from `/dashboard/admin` (or SQL).
- Route guards (`requireRole`) run in server components; `src/proxy.ts`
  handles authentication (login required for `/dashboard/*`, with `/` and
  `/dashboard` acting as the public landing page).

| Role | Access |
| --- | --- |
| `viewer` | Browse categories, Explore, Subscription, Settings; can become a `creator` |
| `creator` | + Studio: upload, shorts/live studio, my content, analytics, comments, monetization; watches own uploads free, others stay padlocked until subscribed |
| `admin` | + `/dashboard/admin`: user CRUD, deposit approval, payment settings, views per video |

## Content & payments

- **Upload** (creators): `UploadWidget` uploads the file to the private
  `videos` bucket (`<user-id>/<uuid>.mp4`, auto-generated thumbnail in the
  public `thumbnails` bucket) and inserts a row in `public.videos`.
- **Padlocks**: videos render locked unless the viewer is an admin, the
  video's own creator, or holds an `active` subscription. Locked playback is
  enforced twice: app-side (`isVideoUnlocked` in `src/lib/videos.ts`) and at
  the file level (`/api/videos/[id]/stream` issues a signed URL only after
  the access check; the storage bucket has matching RLS).
- **Paying**: the Subscription page offers 4 plans — 24h/UGX 1,000, 3 days/UGX
  3,000, 1 week/UGX 5,000, 1 month/UGX 10,000 (`subscription_plans` table).
  The customer picks a plan, deposits to the admin-configured account/number,
  and submits their transaction reference. It lands as `pending` under Admin →
  Deposit Requests; approving stamps `expires_at = now() + plan duration` and
  opens every padlock until then. Expired subscriptions re-lock automatically
  (`has_active_subscription` + `isVideoUnlocked`).
- **Admin**: real stats, per-video view counts, user role/display-name edits
  and deletion (`admin_delete_user`), deposit approve/reject, and editable
  payment details.

## Structure

```
src/
├── app/
│   ├── api/auth/          login, signup, logout route handlers
│   ├── api/admin/         users, subscriptions, payment-settings
│   ├── api/videos/        delete + signed-URL streaming (access-checked)
│   ├── login/             sign in / sign up
│   └── dashboard/         app shell + 23 pages (incl. watch/[id])
├── components/
│   ├── layout/            Header, Sidebar, MobileNav, Logo
│   ├── dashboard/         CategoryFeed, VideoGrid, LiveStreams, UploadWidget
│   ├── admin/             UsersTable, PendingPayments, PaymentSettingsForm
│   ├── subscription/      SubscriptionPanel (deposit + reference form)
│   ├── settings/          RoleSection (become a creator)
│   ├── videos/            DeleteVideoButton
│   └── ui/                Card, StatCard, StatusBadge, PageHeader
├── lib/
│   ├── auth.ts            getCurrentUser, requireUser, requireRole
│   ├── roles.ts           roles, navigation items, section labels
│   ├── videos.ts          categories, padlock logic, video queries
│   ├── rate-limit.ts      in-memory limiter for the auth endpoints
│   └── supabase/          env + server client + browser client
└── proxy.ts             session check for every route
```

## Current limitations

Live streams, shorts, comments, search, notifications, and the settings form
still render mock/static UI; analytics charts are placeholders.
