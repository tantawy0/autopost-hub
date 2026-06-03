# Deployment Checklist

Last audited: 2026-06-02

## Pre-Deploy

- [ ] Confirm `npm test` passes.
- [ ] Confirm `npm run lint` passes.
- [ ] Confirm `npm run build -- --webpack` passes.
- [ ] Confirm `.env.local.example` matches hosting env configuration.
- [ ] Confirm no server secret is prefixed with `NEXT_PUBLIC_`.
- [ ] Confirm `NEXT_PUBLIC_APP_URL` is the production URL.

## Supabase

- [ ] Create production Supabase project.
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL`.
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- [ ] Enable Google provider if using social login.
- [ ] Enable GitHub provider if using social login.
- [ ] Add `/auth` production and local redirect URLs.
- [ ] Apply all migrations in `supabase/migrations`.
- [ ] Confirm RLS is enabled on all user/workspace tables.
- [ ] Confirm service-role usage is limited to route handlers/workers.
- [ ] Confirm migration `202605260001_storage_post_images_bucket.sql` created `post-images`.
- [ ] Confirm storage policies from `docs/STORAGE_BUCKETS.md` are active.
- [ ] Verify media upload with a real authenticated account.
- [ ] Enable Supabase Auth leaked-password protection in the dashboard.

## Meta OAuth

- [ ] Create/configure production Meta app.
- [ ] Set `META_APP_ID`.
- [ ] Set `META_APP_SECRET`.
- [ ] Set `META_REDIRECT_URI=https://<production-domain>/api/meta/callback`.
- [ ] Add exact callback URL in Meta app settings.
- [ ] Configure requested scopes.
- [ ] Complete Meta app review for production scopes if required.
- [ ] Connect one Facebook Page and one Instagram Business/Creator account in staging/production.

## AI / Agents

- [ ] Set `OPENROUTER_API_KEY` server-side.
- [ ] Confirm `AI_MODEL_ASSISTANT` is allowlisted in `lib/server/ai/model-config.ts`.
- [ ] Set `API_KEY_21ST` server-side if using 21st token/agent routes.
- [ ] Add valid external provider key for `my-agent` in the 21st dashboard/CLI.
- [ ] Test `/api/ai/assistant` with authenticated user.
- [ ] Test `/api/an-status` and 21st agent chat path.

## Billing / Payments

- [ ] Create Stripe products and recurring monthly Prices for Creator, Pro, and Agency.
- [ ] Set `STRIPE_SECRET_KEY` server-side only.
- [ ] Set `STRIPE_WEBHOOK_SECRET` server-side only.
- [ ] Set `STRIPE_PRICE_CREATOR`, `STRIPE_PRICE_PRO`, and `STRIPE_PRICE_AGENCY`.
- [ ] Configure Stripe webhook endpoint: `/api/stripe/webhook`.
- [ ] Subscribe webhook to checkout/session and customer/subscription events.
- [ ] Test Free plan signup.
- [ ] Test paid checkout in Stripe test mode.
- [ ] Test Billing Portal return to `/settings`.

## Cron / Workers

- [ ] Generate a long random `CRON_SECRET`.
- [ ] Set `CRON_SECRET` server-side.
- [ ] Configure `POST /api/scheduler/process-due-posts` every minute.
- [ ] Configure `POST /api/worker/process` every minute.
- [ ] Configure optional dedicated worker calls for `token_refresh`, `analytics_ingest`, and `social_sync`.
- [ ] Verify `GET /api/worker/health` with bearer auth.
- [ ] Verify `GET /api/scheduler/health` with bearer auth.
- [ ] Verify `GET /api/ops/readiness` returns `ok: true` with bearer auth.
- [ ] Confirm unauthenticated cron calls return 401.

## Hosting Notes

### Vercel

- [ ] Add all env vars to Project Settings for Production and Preview.
- [ ] Use Node runtime compatible with Next.js 16.
- [ ] On Vercel Pro/Enterprise, optionally add `vercel.json` for `/api/cron/scheduler` and `/api/cron/worker`.
- [ ] On Vercel Hobby, configure an external scheduler because per-minute Vercel Cron is unavailable.
- [ ] Confirm `CRON_SECRET` is configured so Vercel sends bearer authorization to cron bridges.
- [ ] Confirm serverless function timeouts are enough for provider calls.

### Railway / Long-Running Hosts

- [ ] Configure env vars in Railway service variables.
- [ ] Configure cron/scheduled jobs with bearer auth.
- [ ] Confirm graceful SIGTERM handling for worker runtime.
- [ ] Keep service memory limits sufficient for Next build/runtime.

## Post-Deploy Smoke

- [ ] `GET /api/health` returns `ok: true`.
- [ ] Protected health endpoints succeed with `CRON_SECRET`.
- [ ] `GET /api/ops/readiness` passes database and storage probes.
- [ ] Auth sign-in works.
- [ ] Channel connection starts Meta OAuth.
- [ ] Draft autosave succeeds.
- [ ] Media upload succeeds.
- [ ] Schedule post succeeds.
- [ ] Due-post scheduler and worker process run without 500s.
- [ ] No secret values appear in browser source, network responses, or logs.
