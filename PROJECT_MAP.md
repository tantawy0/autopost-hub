# AutoPost Hub Project Map

Last generated: 2026-05-26

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- Supabase Auth, Postgres, RLS, and Storage.
- Framer Motion, lucide-react, Sonner, shadcn-style UI primitives.
- OpenRouter-backed AI routes with heuristic fallback.
- 21st SDK agent integration under `agents/my-agent`.

## Folder Structure Summary

| Path | Purpose |
| --- | --- |
| `app/` | Next.js pages, layouts, global styles, and route handlers. |
| `app/api/` | Server API routes for auth-scoped app actions, worker/cron, AI, providers, analytics, and health. |
| `components/` | Client UI for app shell, dashboard, channels, post composer, calendar, scheduler, and shared UI primitives. |
| `lib/` | Core client/server services, Supabase clients, domain logic, validation, provider adapters, publishing, auth, and types. |
| `lib/server/` | Server-only services: authorization, audit, env validation, rate limiting, AI providers, analytics ingestion, and jobs. |
| `supabase/migrations/` | Idempotent schema/storage migrations with RLS and indexes. |
| `docs/` | Production, environment, cron, storage, deployment, Meta, and RLS documentation. |
| `tests/unit/` | Deterministic backend/domain unit tests using Node test runner and fake Supabase helpers. |
| `tests/e2e/` | Playwright specs, mostly environment-gated for real browser/app credentials. |
| `agents/my-agent/` | 21st SDK creator assistant with tools for captions, hashtags, timing, analytics, and draft payloads. |

## Important App Routes

| Route | File | Role |
| --- | --- | --- |
| `/` | `app/page.tsx` | Dashboard shell with growth summary, queue, actions, insights, recent posts. |
| `/auth` | `app/auth/page.tsx` | Sign in/sign up UI backed by Supabase auth. |
| `/create-post` | `app/create-post/page.tsx` | Composer entry point using `PostComposerForm`. |
| `/edit-post/[id]` | `app/edit-post/[id]/page.tsx` | Existing post editor entry point. |
| `/drafts` | `app/drafts/page.tsx` | Draft listing and post management. |
| `/calendar` | `app/calendar/page.tsx` | Calendar/timeline view of scheduled posts. |
| `/published` | `app/published/page.tsx` | Published/imported post history. |
| `/channels` | `app/channels/page.tsx` | Connected channel management and Meta setup. |
| `/settings` | `app/settings/page.tsx` | Settings surface. |
| `/community` | `app/community/page.tsx` | Community/visual route. |
| `/ai-agent` | `app/ai-agent/page.tsx` | 21st agent chat UI integration. |

## Important API Routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | Public | Liveness and non-sensitive production env readiness. |
| `GET /api/worker/health` | `CRON_SECRET` | Worker health and protected env readiness. |
| `POST /api/worker/process` | `CRON_SECRET` | Claims/runs background jobs. |
| `GET /api/scheduler/health` | `CRON_SECRET` | Scheduler health and protected env readiness. |
| `POST /api/scheduler/process-due-posts` | `CRON_SECRET` | Processes due scheduled posts globally. |
| `POST /api/scheduler/process-my-due-posts` | Bearer user | Processes current user's due posts. |
| `POST /api/posts/autosave` | Bearer user + workspace RBAC | Versioned draft autosave persistence. |
| `POST /api/posts/[postId]/publish-now` | Bearer user + ownership/RBAC | Immediate publishing for selected destinations. |
| `GET /api/meta/login` | Supabase session | Starts Meta OAuth. |
| `GET /api/meta/callback` | Meta OAuth state | Exchanges code, stores accounts/tokens. |
| `POST /api/instagram/sync-posts` | Bearer user | Syncs real published Facebook/Instagram posts. |
| `POST /api/analytics/ingest` | Bearer user + analytics RBAC | Idempotent analytics ingestion, optional async enqueue. |
| `GET/POST /api/automation/flows` | Bearer user | Automation flow foundation CRUD. |
| `GET/POST /api/brand-brain` | Bearer user | Brand profile/brain foundation. |
| `GET /api/engagement/threads` | Bearer user | Engagement inbox thread foundation. |
| `GET /api/notifications` | Bearer user | Notification list. |
| `GET /api/workspaces` | Bearer user | Ensures/returns default workspace. |
| `POST /api/ai/assistant` | Bearer user + AI RBAC | AI suggestions with provider fallback and persistence. |
| `POST /api/ai/content-score` | Bearer user + AI RBAC | Content score API foundation. |
| `GET /api/an-status` | Public | Non-secret 21st/AI status. |
| `POST /api/an-token` | Bearer user + AI RBAC | 21st token route. |
| `POST /api/agent/sandbox` | Bearer user + AI RBAC | 21st sandbox creation. |
| `GET/POST /api/agent/threads` | Bearer user + AI RBAC | 21st thread list/create. |

## Core Backend Services

| File | Purpose |
| --- | --- |
| `lib/types.ts` | Canonical DTOs and normalizers for platforms, statuses, media, posts, accounts. |
| `lib/supabase.ts` | Browser Supabase client using public env only. |
| `lib/supabase-server.ts` | Server/service-role Supabase client and app URL helper. |
| `lib/auth.ts` | Client/bearer auth, ownership and safe error mapping. |
| `lib/server/authorization.ts` | Workspace permissions, bearer auth, cron auth, ownership assertions, denied audit logs. |
| `lib/workspaces.ts` | Default workspace creation and role capability helpers. |
| `lib/posts.ts` | Post reads/writes, dashboard summary, media upload, scheduling, publish client call. |
| `lib/publishing.ts` | Publish orchestration, token refresh, provider dispatch, attempts, terminal status. |
| `lib/oauth-tokens.ts` | OAuth token encryption/decryption and refresh/reconnect handling. |
| `lib/server/audit.ts` | Audit log writer. |
| `lib/server/rate-limit.ts` | Server-side action rate limiting. |
| `lib/server/production-env.ts` | Required/recommended/optional env validation. |
| `lib/server/env-security.ts` | Secret exposure helper for tests/security checks. |
| `lib/server/secrets.ts` | Secret encryption/decryption/hashing with `TOKEN_ENCRYPTION_KEY`. |

## Provider Modules

| File | Status | Purpose |
| --- | --- | --- |
| `lib/providers/meta.ts` | Real | OAuth URL/state signing, code exchange, long-lived tokens, destination discovery. |
| `lib/providers/facebook.ts` | Real | Facebook Page feed/photo/video publishing with provider error mapping. |
| `lib/providers/instagram.ts` | Real | Instagram Business media container creation, publishing, comments, polling. |
| `lib/providers/tiktok.ts` | Placeholder | Capability stub; publishing intentionally unavailable. |

## Worker/Queue Modules

| File | Purpose |
| --- | --- |
| `lib/server/jobs/types.ts` | Background job types: `publish_post`, `analytics_ingest`, `token_refresh`, `social_sync`. |
| `lib/server/jobs/queue.ts` | Job enqueue/claim/release/complete, stale release, idempotency checks. |
| `lib/server/jobs/enqueue.ts` | Typed enqueue helpers for analytics, token refresh, social sync. |
| `lib/server/jobs/worker.ts` | Worker runtime loop/health and job execution orchestration. |
| `lib/server/jobs/handlers/index.ts` | Dispatches job types to publishing, analytics, token refresh, social sync handlers. |
| `lib/server/jobs/handlers/social-sync.ts` | Syncs real provider posts/metrics into `social_posts`. |
| `lib/server/jobs/retry-policies.ts` | Retry limits/delays and retryable error classification. |
| `lib/server/jobs/idempotency.ts` | Stable idempotency key helpers. |
| `lib/server/jobs/logger.ts` | Structured worker log output without secrets. |
| `lib/server/queue.ts` | Compatibility export for scheduler enqueue helper. |

## AI Modules

| File | Purpose |
| --- | --- |
| `lib/server/ai/providers/openrouter.ts` | OpenRouter chat completion adapter. |
| `lib/server/ai/providers/heuristic.ts` | Local deterministic fallback provider. |
| `lib/server/ai/providers/registry.ts` | Primary provider selection/status. |
| `lib/server/ai/model-config.ts` | Provider/model config and allowlist validation. |
| `lib/server/ai/assistant-service.ts` | AI assistant prompt building, fallback behavior, logging. |
| `lib/server/ai/content-score-service.ts` | AI score generation and persistence. |
| `lib/server/ai/prompt-versions.ts` | Active prompt version lookup/fallback. |
| `lib/server/ai/generation-log.ts` | Persists `ai_generations`. |
| `lib/server/ai/usage-tracking.ts` | Persists provider usage events. |
| `lib/server/ai/ai-errors.ts` | Safe AI error mapping. |
| `lib/agent-client.ts` | 21st SDK client. |
| `lib/agent-errors.ts` | 21st setup/error hints. |
| `agents/my-agent/index.ts` | 21st agent definition and tools. |

## Analytics Modules

| File | Purpose |
| --- | --- |
| `lib/analytics.ts` | Lightweight overview DTO for UI. |
| `lib/server/services/analytics-ingest.ts` | Ingests platform daily metrics with idempotency receipts. |
| `lib/server/services/analytics-metrics.ts` | Normalization, platform/date validation, payload hashing. |
| `lib/server/services/analytics-ingestion-receipts.ts` | Duplicate detection/receipt claims. |
| `lib/server/services/analytics-rollups.ts` | Daily/hourly rollups with idempotency. |
| `lib/server/services/analytics-post-metrics.ts` | Per-post metric snapshot ingestion. |
| `lib/server/services/analytics-growth.ts` | Growth snapshot lifecycle. |
| `lib/server/analytics-errors.ts` | Safe analytics errors. |

## Storage/Media Modules

| File | Purpose |
| --- | --- |
| `lib/validation/media.ts` | Bucket name, MIME allowlist, 200 MB limit, safe path/extension, stored asset validation. |
| `lib/posts.ts` | `uploadMediaAsset` uploads to Supabase Storage, creates `media_assets`, scopes path by user/workspace. |
| `lib/publishing.ts` | Loads stored `media_assets` for publishing and validates secure URL/bucket/scope. |
| `components/posts/MediaUploader.tsx` | Client upload UI. |
| `components/posts/MediaPreview.tsx` | Client media preview UI. |
| `supabase/migrations/202605260001_storage_post_images_bucket.sql` | Creates public `post-images` bucket and authenticated storage policies. |
| `docs/STORAGE_BUCKETS.md` | Operational bucket and policy documentation. |

## Auth/RBAC Modules

| File | Purpose |
| --- | --- |
| `components/AuthGuard.tsx` | Client route/session guard. |
| `lib/auth.ts` | Auth errors, bearer user resolution, safe response mapping. |
| `lib/client-auth.ts` | Client auth header helper. |
| `lib/server/authorization.ts` | Workspace permissions, RBAC, cron protection, ownership assertions. |
| `lib/workspaces.ts` | Workspace/member role resolution. |
| `supabase/migrations/*` | RLS policies for user/workspace tables and storage objects. |

## Tests Structure

- `tests/unit/*.test.ts`: deterministic Node tests for auth/RBAC, draft autosave, publishing lifecycle, analytics idempotency, AI fallback, secret exposure, media validation.
- `tests/unit/helpers/fake-supabase.ts`: in-memory Supabase-like query helper.
- `tests/e2e/*.spec.ts`: Playwright flows for auth, dashboard, composer, channels, scheduler, publishing, media validation, API authorization. Most are gated by env variables.
- `tests/TESTING_BLOCKERS.md`: documents E2E credential/browser blockers.

## Migrations List And Purpose

| Migration | Purpose |
| --- | --- |
| `202605220001_social_saas_schema.sql` | Base social SaaS tables: media assets, connected accounts, publishing attempts, activity, notifications, analytics; RLS. |
| `202605250001_social_posts.sql` | Imported/published social posts and lifecycle metadata additions. |
| `202605250002_product_engine_foundation.sql` | Workspaces, members, invitations, post destinations, queue jobs, autosaves, analytics, brand brain, AI, engagement, automation, audit logs, rate limits, indexes, RLS. |
| `202605250003_queue_worker_hardening.sql` | Background jobs table, queue hardening, retry/idempotency fields. |
| `202605250004_analytics_ingestion_hardening.sql` | Analytics ingestion receipts, growth snapshots, rollup hardening, RLS. |
| `202605250005_ai_provider_hardening.sql` | Prompt versions, AI usage events, AI generation fields, RLS. |
| `202605260001_storage_post_images_bucket.sql` | Public `post-images` bucket, 200 MB limit, media MIME allowlist, authenticated user/workspace object policies. |
