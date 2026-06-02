# Quickstart: Social Publishing SaaS Transformation

## Prerequisites

- Node.js compatible with the current Next.js project
- Supabase project with Auth enabled
- Supabase Storage bucket `post-images`
- Meta app with Facebook Login configured
- OAuth redirect URI:
  `http://localhost:3001/api/meta/callback`

## Environment Variables

Create or update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3001
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=http://localhost:3001/api/meta/callback
CRON_SECRET=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Rules:
- `NEXT_PUBLIC_*` values may be used by browser code.
- `META_APP_SECRET`, `CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` must stay
  server-side only.

## Setup Steps

1. Install dependencies:

   ```bash
   npm install
   ```

2. Required dependencies added during implementation:

   ```bash
   npm install framer-motion sonner
   npm install -D @playwright/test
   ```

3. Apply Supabase migrations from `supabase/migrations/`.

4. Confirm RLS policies:
   - Posts are scoped by `auth.uid() = user_id`.
   - Media records and storage paths are scoped by owner.
   - Connected accounts are scoped by owner.
   - Publishing attempts are readable only by the owning user.

5. Run the app:

   ```bash
   npm run dev
   ```

## Manual Verification Flow

1. Register a new account and confirm sign-in.
2. Verify protected pages redirect unauthenticated visitors to `/auth`.
3. Open Channels and connect a Facebook Page or Instagram Business account.
4. Confirm TikTok is visible as a placeholder and cannot be used for live
   publishing.
5. Create a draft with caption, first comment, and media.
6. Schedule a post to one valid destination.
7. Schedule a post to multiple valid destinations.
8. Verify unsupported destination/media combinations are blocked before
   scheduling.
9. Disconnect or expire a connected account and confirm scheduling/publishing to
   that destination is blocked until reconnection.
10. Process due posts through the scheduler route with the scheduler secret.
11. Verify Published, Partially Published, and Failed states with visible
    per-destination outcomes.
12. Verify dashboard counts, calendar, drafts, and published views after refresh.
13. Sign in as a second user and confirm they cannot view or mutate the first
    user's posts, media, connected accounts, or publishing attempts.

## Automated Verification

Run:

```bash
npm run lint
npm run build
npm run test:e2e
```

Default E2E behavior:
- Browser-dependent specs are skipped unless `E2E_RUN_BROWSER=1`,
  `E2E_EMAIL`, and `E2E_PASSWORD` are set.
- API specs are skipped unless `E2E_BASE_URL` points to a running app or
  `E2E_START_SERVER=1` is set.
- `E2E_START_SERVER=1` uses the production server command from
  `playwright.config.ts`; run `npm run build` first.

Full local E2E example:

```bash
E2E_START_SERVER=1 E2E_RUN_BROWSER=1 E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
```

Required E2E coverage:
- Login, register, logout, protected routes
- Dashboard counts and empty states
- Composer validation, draft save, schedule save, duplicate-submit prevention
- Media upload and destination-aware validation
- Calendar/list filters and edit links
- Draft edit/delete/schedule later
- Published list sort and destination outcomes
- Channel connect/disconnect and reconnect-required states
- Scheduler processing for Published, Partially Published, and Failed outcomes
- Account isolation across two users

## Remaining Manual Meta Steps

- Confirm provider app is in the correct mode for the test users.
- Confirm permissions required for Facebook Page and Instagram Business account
  publishing are approved or available to testers.
- Confirm redirect URI matches `META_REDIRECT_URI`.
- Confirm provider test accounts have eligible pages/business accounts.

## Next.js Docs Reviewed During Implementation

- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`
- `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md`

## Implementation Verification Results

Recorded on 2026-05-22:

- `npm run lint`: passed with three `@next/next/no-img-element` warnings for
  user-uploaded media previews.
- `npm run build`: passed.
- `npm run test:e2e`: passed with 14 specs skipped because live E2E browser/API
  environment variables were not configured.
- Live Meta authorization and publishing verification remains dependent on a
  configured Meta app, eligible test accounts, approved permissions, and
  Supabase migrations applied to the target project.
