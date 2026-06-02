# Production Readiness Audit

Last audited: 2026-06-02

## Summary

AutoPost Hub is buildable and has the core production architecture in place: authenticated Supabase access, service-role server routes, worker/cron authorization, idempotent publishing, AI provider fallback, audit logs, and deterministic backend tests.

## Hardening Added In This Pass

- Added `lib/server/production-env.ts` for centralized required/recommended/optional env validation.
- Added public app health endpoint: `GET /api/health`.
- Added protected scheduler health endpoint: `GET /api/scheduler/health`.
- Hardened protected worker health output with production env readiness.
- Expanded `.env.local.example` with complete production keys.
- Added production docs for env, cron, storage, and deployment.
- Added strict env validation for placeholders, URL shape, OAuth redirect consistency, server-secret length, and selected AI-provider configuration.
- Added protected `GET /api/ops/readiness` with env, service-role, database, and storage probes.
- Added native Vercel cron bridges; optional Vercel Pro `vercel.json` and external scheduler setup are documented.
- Hardened cron input validation, constant-time cron secret comparison, and generic internal API errors.

## Environment Readiness

See `docs/ENVIRONMENT_VARIABLES.md`.

Production-required keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI`

Recommended live-product keys:

- `OPENROUTER_API_KEY`
- `API_KEY_21ST`

## RLS Audit

Checked migrations:

- `202605220001_social_saas_schema.sql`
- `202605250001_social_posts.sql`
- `202605250002_product_engine_foundation.sql`
- `202605250003_queue_worker_hardening.sql`
- `202605250004_analytics_ingestion_hardening.sql`
- `202605250005_ai_provider_hardening.sql`

Confirmed RLS enabled/policies present for core user tables:

- `posts`
- `media_assets`
- `connected_accounts`
- `publishing_attempts`
- `activity_events`
- `notifications`
- `analytics_daily`
- `social_posts`
- `workspaces`
- `workspace_members`
- `workspace_invitations`
- `post_destinations`
- `post_queue_jobs`
- `draft_autosaves`
- `social_post_metric_snapshots`
- `analytics_rollups`
- `brand_profiles`
- `brand_memory_items`
- `ai_generations`
- `content_scores`
- `engagement_threads`
- `engagement_messages`
- `automation_flows`
- `automation_runs`
- `audit_logs`
- `background_jobs`
- `analytics_ingestion_receipts`
- `analytics_growth_snapshots`
- `ai_prompt_versions`
- `ai_usage_events`

RLS notes:

- Most user-owned tables are scoped by `auth.uid() = user_id`.
- Workspace-shared select policies use private `SECURITY DEFINER` helpers outside the exposed API schema.
- `activity_events`, `notifications`, `analytics_daily`, and `rate_limit_events` have explicit RLS enabled.
- Workspace invitations are readable only by workspace owners/admins.
- `ai_prompt_versions` has public read policy by design for active prompt templates.
- Service-role routes must continue enforcing ownership/RBAC in app code because service role bypasses RLS.

## Storage Audit

See `docs/STORAGE_BUCKETS.md`.

Migration `202605260001_storage_post_images_bucket.sql` creates the public `post-images` bucket and scoped `storage.objects` policies. Verify the bucket after applying migrations.

## Cron / Worker Safety

See `docs/CRON_JOBS.md`.

Confirmed:

- `POST /api/worker/process` requires `CRON_SECRET`.
- `GET /api/worker/health` requires `CRON_SECRET`.
- `POST /api/scheduler/process-due-posts` requires `CRON_SECRET`.
- `GET /api/scheduler/health` requires `CRON_SECRET`.
- Process limits are capped at 100.
- Unauthorized cron access is audited as `authz.denied`.

## Health Endpoints

| Endpoint | Status | Auth | Notes |
| --- | --- | --- | --- |
| `GET /api/health` | Added | Public | Liveness and non-sensitive config state only. |
| `GET /api/worker/health` | Verified/hardened | `CRON_SECRET` | Worker runtime state and env readiness. |
| `GET /api/scheduler/health` | Added | `CRON_SECRET` | Scheduler env readiness. |
| `GET /api/ops/readiness` | Added | `CRON_SECRET` | Launch gate for env, service role, database, and storage. |

## Secret Exposure Audit

Confirmed:

- Unit test `security-no-secret-exposure.test.ts` scans client-facing source for secret-shaped literals/private env access.
- `lib/server/env-security.ts` identifies forbidden server secret env keys.
- Public health endpoint does not list missing secret names.
- Protected operational health endpoints require `CRON_SECRET` before listing missing env keys.

## Remaining Production Blockers

1. Configure real Supabase project, anon key, and service-role key in hosting.
2. Apply/verify all Supabase migrations in production.
3. Verify `post-images` bucket and storage policies after migration apply.
4. Configure Meta OAuth production app, redirect URI, scopes, and app review as needed.
5. Configure `CRON_SECRET` and external cron runner with bearer auth.
6. Configure stable `TOKEN_ENCRYPTION_KEY` before connecting real accounts.
7. Configure OpenRouter key for production AI behavior.
8. Configure `API_KEY_21ST` locally/server-side and provider env vars for deployed 21st `my-agent`.
9. Run at least one credential-backed E2E smoke on production or staging.
10. Enable leaked-password protection in Supabase Auth dashboard settings.
