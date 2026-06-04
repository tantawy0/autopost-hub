# AutoPost Hub Implementation Status

Last generated: 2026-06-04

## Fully Implemented

- Next.js app shell and core routes for dashboard, auth, composer, drafts, calendar, published posts, channels, settings, community, and AI agent page.
- Supabase client/server setup with server-only service-role isolation.
- Auth helpers, bearer auth, safe error mapping, ownership assertions, workspace RBAC, and cron authorization.
- Auth callback hardening for Google/GitHub/Supabase OAuth with safe `next` redirects and no open redirect path.
- Core post lifecycle: draft, schedule, publish-now, process due posts, terminal state protection, per-destination publishing attempts.
- Meta OAuth foundation: login, callback, signed state, token exchange, long-lived token exchange, destination discovery.
- Facebook Page publishing and Instagram Business publishing provider modules.
- Connected account listing, disconnect flow, reconnect-required states, selectable destinations.
- OAuth reconnect capacity hardening for existing Meta/LinkedIn channels so re-auth flows are not blocked as brand-new channel additions.
- Draft autosave API with versioned persistence.
- Media validation/upload/storage pipeline using `post-images`, user/workspace-scoped paths, DB records, and publish-time stored media validation.
- Supabase storage migration for `post-images` bucket and authenticated object policies.
- Worker/queue foundation with cron-protected process endpoint, health endpoint, job claiming, retry policy, idempotency, and handlers.
- Analytics ingestion foundation with idempotency receipts, rollups, growth snapshots, post metric snapshots.
- AI assistant/content score APIs with OpenRouter provider, heuristic fallback, usage/generation persistence, prompt version fallback, and rate limiting.
- Brand brain, automation flows, engagement inbox, notifications, activity/audit foundations.
- Production docs for env, cron, storage, deployment, RLS, Meta setup.
- Deterministic unit test suite for backend-critical behavior.

## Partially Implemented

- Browser/API E2E coverage is active after `npm run setup:e2e`; authenticated browser/API suite passes against local production server and the production Vercel URL.
- Analytics UI/aggregation is foundation-level; real provider metric sync is present but needs credential-backed staging validation.
- AI product experience is connected but depends on valid provider keys for production-quality completions.
- Brand brain and automation APIs persist basic records but do not yet include full product workflows/runners.
- Engagement inbox has a data model and list endpoint, but full reply/sync workflow is not complete.
- Workspace/team model and RBAC exist, but advanced team invitation/management UI is limited.
- Media storage is production-shaped; private media/signed URL mode is documented as a future strategy if needed.

## Placeholder Or Stub

- TikTok provider is intentionally a placeholder and not publish-capable.
- 21st `my-agent` tools return useful structured assistant outputs but are not deeply integrated into post creation persistence.
- `community` and some premium UI surfaces are visual/product polish rather than full backend workflows.
- Automation flow execution engine is foundation-only.
- Advanced scheduling features such as recurring/smart scheduling are not complete.

## Needs Real Credentials

- Supabase project URL, anon key, and service-role key.
- Meta app id, app secret, redirect URI, scopes, and production app review/access where required.
- OpenRouter API key for primary AI provider behavior.
- 21st API key for local token/sandbox routes.
- External provider key inside the 21st dashboard/CLI for deployed `my-agent`.
- Cron secret for protected worker/scheduler endpoints.
- Stable token encryption key before connecting production accounts.

## Needs Supabase Dashboard/CLI Setup

- Apply all migrations in `supabase/migrations/`; linked production check on 2026-06-04 reported the remote database is up to date with `supabase@2.104.0`.
- Confirm RLS policies are present after migration.
- Confirm `post-images` bucket exists, is public, has 200 MB file limit, and allowed MIME types match `lib/validation/media.ts`.
- Confirm storage policies from `202605260001_storage_post_images_bucket.sql` are applied.
- Verify real authenticated media upload and provider-fetchable public URL.

## Needs Cron Setup

- `POST /api/scheduler/process-due-posts` every minute with `Authorization: Bearer <CRON_SECRET>`.
- `POST /api/worker/process` every minute with `Authorization: Bearer <CRON_SECRET>`.
- Optional dedicated worker calls:
  - token refresh every 5 minutes with `jobTypes: ["token_refresh"]`.
  - analytics ingestion every 10-15 minutes with `jobTypes: ["analytics_ingest"]`.
  - social sync every 15-30 minutes with `jobTypes: ["social_sync"]`.
- Verify `GET /api/worker/health` and `GET /api/scheduler/health` with bearer auth.

## Needs Production Deployment Setup

- Configure all required env vars server-side in hosting.
- Ensure no server secret uses `NEXT_PUBLIC_`.
- Configure exact production `NEXT_PUBLIC_APP_URL` and `META_REDIRECT_URI`.
- Production deploy is live at `https://autopost-hub.vercel.app` with Google/GitHub OAuth start smoke passing.
- Use an external cron runner if hosting cron cannot send bearer headers.
- Run credential-backed staging smoke for auth, channel connect, media upload, autosave, schedule, publish, worker, scheduler, AI.
- Add error tracking/observability such as Sentry or equivalent.

## Current Test/Build Status

- `npm test`: passing 57/57 unit tests.
- `npm run test:e2e`: passing 19/19 Playwright tests locally and against `https://autopost-hub.vercel.app` with configured E2E credentials.
- `npm run lint`: passing.
- `npm run build -- --webpack`: passing.
- Local and production cron smoke checks passed for protected health/process authorization.
- Production auth smoke passed with email/password login, Google OAuth start, GitHub OAuth start, safe callback errors, and protected redirect behavior.
- Prior local smoke: protected health/cron auth, AI status no-secret exposure, analytics/autosave unauthorized behavior passed.
- Supabase linked db push with `supabase@2.104.0` reports the remote database is up to date.

## Current Known Blockers

- Provider-success publishing E2E still requires a safe Meta sandbox/test account, eligible Facebook/Instagram assets, and approved provider access where applicable.
- Real Google/GitHub OAuth completion has been smoke-tested only to provider start plus email/password production login; full external-provider account consent remains a manual browser check.
- TikTok publishing is not implemented.
- Full automation runner, engagement reply workflow, advanced team management, and recurring/smart scheduling remain future slices.
