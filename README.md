# HAPPYPORN.COM

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
SUPABASE_SERVICE_ROLE_KEY=...        # server only: uploads + webhooks

# Bunny Stream video hosting
BUNNY_STREAM_LIBRARY_ID=...
BUNNY_STREAM_API_KEY=...             # library API key: uploads
BUNNY_STREAM_READ_ONLY_API_KEY=...   # library read-only key: webhook signature
BUNNY_STREAM_TOKEN_KEY=...           # Security > Token authentication key

# Mux live streaming
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
MUX_SIGNING_KEY=...
MUX_PRIVATE_KEY=...
MUX_WEBHOOK_SECRET=...
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback for the publishable key.

## Database

The migrations in `supabase/migrations/` **must be run in order** in the
Supabase SQL editor. Every file is idempotent, so a failed file can be run
again. Each file ends with a `select` that shows what it created.

| # | File | What it does |
| --- | --- | --- |
| 1 | `0001_auth_setup.sql` | `public.profiles`, RLS, `handle_new_user` trigger |
| 2 | `0002_security_hardening.sql` | column-level grants, role-escalation trigger |
| 3 | `0003_content_and_payments.sql` | `videos`, `subscriptions`, `payment_settings`, storage buckets, admin RPCs |
| 4 | `0004_subscription_plans.sql` | billing plans, expiry-aware access |
| 5 | `0005_rebrand.sql` | re-points `auth.users` at `@happyporn.local`, rebrands the payment account label |
| 6 | `0006_settings.sql` | `public.app_settings` (WhatsApp support, payout details, monthly pool, live weekdays) |
| 7 | `0007_categories.sql` | `public.categories` + the 10 sector seeds, migrates `videos.category` to the new slugs, adds `width/height/duration_seconds/aspect` |
| 8 | `0008_listings.sql` | `listings`, `listing_contacts`, `listing_photos`, the private `listing-verification` bucket, `admin_review_listing()` |
| 9 | `0009_upload_verification.sql` | `profiles.verification_exempted`, video review columns, `admin_review_video()`, `admin_set_verification_exemption()` |
| 11 | `0011_views.sql` | `video_views` ledger, `can_access_video_by_id()`, `record_video_view()`, `creator_view_counts()` |
| 12 | `0012_wallet.sql` | `wallets`, `wallet_transactions`, `withdrawal_requests`, `request_withdrawal()`, `run_monthly_payouts()` |
| 13 | `0013_live.sql` | `live_streams`, `live_chat_messages`, `live_gifts`, `gift_deposits`, the live-day rule, `send_live_gift()` |
| 14 | `0014_rls_role_scope.sql` | scopes the legacy 0003 policies to `authenticated` (fixes the `is_admin()` 42501 error) |
| 15 | `0015_mux.sql` | Mux columns on `videos`, nullable `video_path`, id-based access check, Mux-aware view recording |
| 17 | `0017_remove_leaks.sql` | removes the Leaks sector and any videos in it |
| 18 | `0018_bunny.sql` | Bunny Stream columns on `videos` |
| 19 | `0019_admin_views.sql` | admin plays no longer count as views |
| 20 | `0020_comments.sql` | `video_comments` and the functions for posting, listing, hiding and deleting them |

### Applying them without the SQL editor

```bash
SUPABASE_ACCESS_TOKEN=<personal access token> node scripts/migrate.mjs
```

The script posts each file as one multi-statement query, so a failure rolls
back the whole file. It also accepts `DATABASE_URL` instead of a token.

> The app fails closed: if `profiles` is missing, every user is treated as a
> `viewer` and a warning is logged. The same applies to every new table — the
> admin panels show empty states instead of crashing.

## The nine sectors

Five video sectors and four listing sectors. `public.categories` is the
authority for which sectors are free; `src/lib/categories.ts` mirrors it and
is used as the fallback (unknown slugs fail closed as **paid**).

| Sector | Kind | Access | Rule |
| --- | --- | --- | --- |
| Picha | listing | free | photo galleries and picture collections |
| Wardrobe | listing | free | merchants selling sex toys |
| Exclusively Ugandan | video | paid | only Ugandan-made videos |
| Appetizers | video | paid | max 5 minutes |
| Quickies | video | paid | max 2 minutes |
| Masseuse | listing | free | **admin verification required** |
| Hookups | listing | free | **admin verification required** |
| Live | video | paid | live streams and their recordings |
| Explore | video | paid | everything else |

## Auth model

- Users sign up with a **username**, mapped to `<username>@happyporn.local`
  (`src/lib/auth.ts`). Migration 0005 re-points existing accounts.
- **Role lives only in `public.profiles.role`** and is read server-side by
  `getCurrentUser()`. It is never read from `user_metadata`.
- New accounts are always `viewer`. A viewer may upgrade **only themselves**
  to `creator`; any other role change is an admin action.
- Route guards (`requireRole`) run in server components; `src/proxy.ts` handles
  authentication for `/dashboard/*`.

| Role | Access |
| --- | --- |
| `viewer` | Browse the sectors, Explore, Subscription, Settings; can become a `creator` |
| `creator` | + Studio: upload, live studio, my content, my profiles, analytics, wallet; watches own uploads free |
| `admin` | + `/dashboard/admin`: users, video review, profile verification, live requests, deposits, wallets, settings |

## Video hosting (Bunny Stream)

Regular videos are hosted on **Bunny Stream**. Mux is used for live streams only.

1. The browser reads the file's dimensions/duration and uploads the cover
   image to the public `thumbnails` bucket.
2. `POST /api/videos` creates the `videos` row and a Bunny video, stores its
   `bunny_video_id`, and returns a signature valid for that one video.
3. The browser uploads the file straight to Bunny over TUS, which resumes after
   dropped connections. It never passes through the Next.js server.
4. Bunny calls `POST /api/webhooks/bunny` as the video encodes. The webhook is
   signature-verified and, when encoding finishes, stores `bunny_status`,
   duration, dimensions and aspect on the row.

Playback stays behind the app's paywall. `/api/videos/[id]/stream` performs the
admin/owner/free-sector/subscription check, then returns a short-lived signed
embed URL that `VideoPlayer` loads in an iframe. Views are recorded from the
player's Player.js `play` event. Deleting a video also deletes it from Bunny.

### Bunny library setup

1. Create a Stream library and copy its Library ID, API key and read-only API
   key into `.env.local`.
2. Under **Security**, enable **Embed view token authentication** and copy the
   **Token authentication key** into `BUNNY_STREAM_TOKEN_KEY`.
3. Add your site to **Allowed domains** (exact host, no scheme), then enable
   **Block Direct URL File Access**.
4. Set the webhook URL to `https://<your-domain>/api/webhooks/bunny`.
5. Confirm that a video's `https://<pull-zone>.b-cdn.net/<video-id>/playlist.m3u8`
   URL returns 403 when opened directly.

## Live streaming (Mux)

Set the webhook URL in the Mux dashboard to:

```
https://<your-domain>/api/webhooks/mux
```

## Uploads and verification

- **Upload** (creators): `UploadWidget` reads the video metadata, enforces the
  duration limit of the sector, then uploads to Bunny and a thumbnail to
  the public `thumbnails` bucket.
- Every upload starts as `pending_review` unless the creator is exempt. An
  admin approves or rejects it from `/dashboard/admin/videos`.
- A creator can be **exempted** from review (`profiles.verification_exempted`)
  from `/dashboard/admin` → the user list. The column is never writable by the
  creator; only `admin_set_verification_exemption()` changes it.
- Locked playback is enforced twice: app-side (`isVideoUnlocked` in
  `src/lib/videos.ts` and the id-based `can_access_video_by_id()`), and at the
  playback route, which issues signed Bunny embeds only after that check.

## Listings and verification

- Creators publish profiles from `/dashboard/my-listing` (one per sector).
- Picha and Wardrobe profiles publish immediately. **Masseuse and Hookups**
  start as `pending` and need an admin at `/dashboard/admin/listings`.
- Approval requires a full-body photo **and** a face photo, enforced by the
  `admin_review_listing()` RPC. Body and face photos live in the private
  `listing-verification` bucket and are only served as short-lived signed URLs
  to the owner and admins.
- The phone number and address sit in `listing_contacts` and stay hidden from
  everyone else until the profile is approved.

## Views and earnings

- A free viewer counts **one view per video per day**; a subscriber counts
  every play; a creator's own views never count (`record_video_view()`).
- `videos.views` is the counter shown in the UI. `video_views` is the ledger
  used for payouts.
- The **monthly pool** (`app_settings.monthly_pool`, subscription revenue
  only) is split between creators in proportion to the views they collected in
  that month. `run_monthly_payouts('2026-10')` is idempotent — running it twice
  never pays twice.
- **Live gifts** are credited separately (`wallet_transactions.kind = 'gift'`),
  so pool income and gift income never blur together.
- A withdrawal **holds** the amount immediately; rejecting the request refunds
  it.

## Live

- Creators request a stream at `/dashboard/live-studio`; an admin approves it
  at `/dashboard/admin/live`.
- Going live is only allowed on **Wednesday, Friday, Saturday and Sunday**
  (`app_settings.live_allowed_weekdays`, editable in admin settings). The rule
  is enforced in the database (`can_go_live_today()`), not just in the UI.
- Chat runs over Supabase Realtime on `public.live_chat_messages` (migration
  0013 adds it to the `supabase_realtime` publication).
- Gifts cost gift credit, which is topped up with the same manual-deposit and
  admin-approval flow as the subscription.
- The media itself is provider-agnostic: `src/lib/providers/live.ts` defines
  the `LiveProvider` interface, and the bundled `LocalProvider` runs the whole
  workflow without a vendor. Swapping in a real vendor touches that one file.

## Structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/      users, videos, listings, live, gifts, wallet, settings, exemptions
│   │   ├── auth/       login, signup, logout
│   │   ├── gifts/      gift top-ups
│   │   ├── listings/   profile create/update, photo upload
│   │   ├── live/       request, start, end, chat, gift
│   │   ├── videos/     upload creation, delete, playback, view recording
│   │   ├── webhooks/   Bunny video webhook, Mux live webhook
│   │   └── wallet/     withdrawals
│   ├── dashboard/      app shell + the sector, studio, admin and account pages
│   └── login/
├── components/
│   ├── admin/          UsersTable, VideoReviewTable, ListingReviewTable, LiveRequestTable,
│   │                   GiftDepositTable, WithdrawalTable, PayoutRunner, AdminSettingsPanel, AdminTabs
│   ├── dashboard/      CategoryFeed, VideoGrid, UploadWidget
│   ├── layout/         Header, Sidebar, MobileNav, Logo
│   ├── listings/       ListingFeed, ListingGrid, ListingManager
│   ├── live/           LiveStreamCard, LiveChat, LiveViewer, LiveStudioPanel
│   ├── subscription/   SubscriptionPanel
│   ├── ui/             Card, StatCard, StatusBadge, VerifiedBadge, PageHeader
│   ├── videos/         VideoPlayer, DeleteVideoButton
│   └── wallet/         WalletPanel
├── lib/
│   ├── auth.ts         getCurrentUser, requireUser, requireRole
│   ├── bunny.ts        Bunny Stream videos, upload signatures, signed embeds, webhooks
│   ├── categories.ts   the nine sectors, access map, upload validation
│   ├── live.ts         live types and queries
│   ├── listings.ts     listing queries, photo URLs, contact visibility
│   ├── mux.ts          Mux client, live streams, playback tokens, webhooks
│   ├── providers/      live.ts — the LiveProvider interface
│   ├── roles.ts        roles and navigation
│   ├── videos.ts       video types, padlock logic, status labels
│   ├── wallet.ts       wallet, transactions, withdrawals
│   └── supabase/       env + server client + browser client + service-role client
└── proxy.ts            session check for every route
```

## Current limitations

- The live media feed is provider-agnostic: the workflow, chat and gifts all
  work, but the actual video stream is served by whatever provider is wired
  into `src/lib/providers/live.ts`.