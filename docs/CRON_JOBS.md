# Cron Jobs

Last audited: 2026-06-02

All production cron requests must include:

```http
Authorization: Bearer <CRON_SECRET>
Content-Type: application/json
```

## Required Jobs

| Job | Endpoint | Suggested schedule | Body | Purpose |
| --- | --- | --- | --- | --- |
| Worker process | `POST /api/worker/process` | Every 1 minute | `{ "limit": 25 }` | Claims and runs queued `publish_post`, `analytics_ingest`, `token_refresh`, and `social_sync` jobs. |
| Scheduler process due posts | `POST /api/scheduler/process-due-posts` | Every 1 minute | `{ "limit": 25 }` | Finds due scheduled posts and enqueues/dispatches publishing work. |
| Token refresh | `POST /api/worker/process` | Every 5 minutes | `{ "limit": 25, "jobTypes": ["token_refresh"] }` | Processes token refresh jobs for connected accounts. |
| Analytics sync | `POST /api/worker/process` | Every 10-15 minutes | `{ "limit": 25, "jobTypes": ["analytics_ingest"] }` | Processes queued analytics ingestion work. |
| Social sync | `POST /api/worker/process` | Every 15-30 minutes | `{ "limit": 10, "jobTypes": ["social_sync"] }` | Processes queued published-post sync work. |

## Health Endpoints

| Endpoint | Auth | Response |
| --- | --- | --- |
| `GET /api/health` | Public | App liveness and non-sensitive config state. |
| `GET /api/worker/health` | `CRON_SECRET` | Worker runtime state and missing required env names. |
| `GET /api/scheduler/health` | `CRON_SECRET` | Scheduler readiness and missing required env names. |
| `GET /api/ops/readiness` | `CRON_SECRET` | Launch gate for env validation, service role, database, and `post-images` storage. |

## Production Safety

- `CRON_SECRET` is enforced by `assertCronSecret`.
- Worker and scheduler process limits are capped at 100.
- Unauthorized cron calls write `authz.denied` audit entries.
- Worker jobs are idempotency-keyed in `background_jobs`.
- Scheduled publishing still checks terminal post status before provider calls.

## Vercel Example

For Vercel Pro or Enterprise, add this optional `vercel.json`. The app includes Vercel-compatible `GET` bridges. When `CRON_SECRET` is configured in Vercel, Vercel adds the bearer authorization header automatically.

```json
{
  "crons": [
    { "path": "/api/cron/scheduler", "schedule": "* * * * *" },
    { "path": "/api/cron/worker", "schedule": "* * * * *" }
  ]
}
```

Do not add the per-minute config on Vercel Hobby: Hobby allows cron jobs only once per day and the deployment will fail. Use Railway Cron, GitHub Actions, Upstash QStash, another external scheduler, or upgrade to Vercel Pro. The `POST` endpoints remain available for external schedulers that send request bodies.

## Supabase Cron For Vercel Hobby

Migration `20260602190854_production_cron_bridge.sql` enables `pg_cron`, `pg_net`, and Vault. It adds a service-role-only `configure_autopost_cron` RPC that stores the production origin and bearer secret in Vault, then schedules the safe Vercel-compatible `GET` bridges every minute.

Configure it once after deployment from a trusted server-side environment:

```ts
await supabase.rpc("configure_autopost_cron", {
  target_app_url: process.env.NEXT_PUBLIC_APP_URL,
  target_cron_secret: process.env.CRON_SECRET,
});
```

The secret remains encrypted in Supabase Vault and is never stored in a migration. Monitor executions in Supabase Dashboard under `Integrations -> Cron`.

## Railway / External Scheduler Example

```bash
curl -X POST "$APP_URL/api/worker/process" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"limit":25}'
```
