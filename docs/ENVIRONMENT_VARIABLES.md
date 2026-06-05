# Environment Variables

Last audited: 2026-06-02

## Production Validation

Runtime validation lives in `lib/server/production-env.ts`.

- Public `/api/health` reports only `configuration: ready|incomplete` and does not reveal missing secret names.
- Protected `/api/worker/health` and `/api/scheduler/health` require `Authorization: Bearer <CRON_SECRET>` and can return missing required env names for operators.
- Protected `/api/ops/readiness` additionally probes the service-role client, database, and `post-images` bucket.
- `.env.local.example` has been expanded to include all production-required and optional keys.
- Validation rejects placeholder required values, malformed URLs, short server secrets, redirect drift, unsupported AI providers, and selected AI providers without keys.

## Required In Production

| Variable | Scope | Required for | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Supabase auth, data, storage | Public but environment-specific. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Browser Supabase client | Public anon key only; RLS must be enabled. |
| `NEXT_PUBLIC_APP_URL` | Client | OAuth redirects, provider referer headers | Must be the canonical production URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Route handlers, workers, cron jobs | Never expose to browser; bypasses RLS. |
| `CRON_SECRET` | Server | Worker and scheduler cron endpoints | Use at least 32 random characters; pass as bearer token. |
| `TOKEN_ENCRYPTION_KEY` | Server | OAuth token encryption | Use at least 32 random characters and keep stable across deploys; rotating requires token migration/reconnect plan. |
| `META_APP_ID` | Server | Meta OAuth | Required for Facebook/Instagram channel connection. |
| `META_APP_SECRET` | Server | Meta OAuth and appsecret_proof | Never expose to browser. |
| `META_REDIRECT_URI` | Server | Meta OAuth callback | Must exactly match Meta app settings. |

## Recommended In Production

| Variable | Scope | Required for | Notes |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Server | Optional Gemini AI provider | Server-only. Use with `AI_PRIMARY_PROVIDER=gemini`. Free-tier-friendly provider option. |
| `OPENROUTER_API_KEY` | Server | Optional OpenRouter AI provider | Server-only. Use with `AI_PRIMARY_PROVIDER=openrouter`; routes fall back to heuristic behavior when absent or invalid. |
| `API_KEY_21ST` | Server | 21st SDK agent/token routes | Provider keys for deployed 21st agents must also be set in the 21st dashboard for `my-agent`. |
| `LINKEDIN_CLIENT_ID` | Server | LinkedIn OAuth | Recommended when enabling LinkedIn channel connection. |
| `LINKEDIN_CLIENT_SECRET` | Server | LinkedIn OAuth | Server-only. Used for token exchange and OAuth state signing. |
| `LINKEDIN_REDIRECT_URI` | Server | LinkedIn OAuth callback | Must exactly match the LinkedIn Developer Portal redirect URL. |
| `INSTAGRAM_APP_ID` | Server | Standalone Instagram Login | Optional if sharing Meta app id; recommended for explicit Instagram Login setup. |
| `INSTAGRAM_APP_SECRET` | Server | Standalone Instagram Login | Optional if sharing Meta app secret; server-only. |
| `INSTAGRAM_REDIRECT_URI` | Server | Standalone Instagram Login callback | Must exactly match the Instagram product callback URL when enabled. |
| `STRIPE_SECRET_KEY` | Server | Paid plans and Stripe Checkout | Required only when enabling paid plans. |
| `STRIPE_WEBHOOK_SECRET` | Server | Stripe subscription lifecycle webhooks | Required only when enabling paid plans. |
| `STRIPE_PRICE_CREATOR` | Server | Creator monthly plan checkout | Stripe recurring Price ID, not a product ID. |
| `STRIPE_PRICE_PRO` | Server | Pro monthly plan checkout | Stripe recurring Price ID, not a product ID. |
| `STRIPE_PRICE_AGENCY` | Server | Agency monthly plan checkout | Stripe recurring Price ID, not a product ID. |

## Optional Overrides

| Variable | Scope | Purpose |
| --- | --- | --- |
| `META_GRAPH_VERSION` | Server | Override Meta Graph API version. |
| `META_SCOPES` | Server | Override requested Meta OAuth scopes. |
| `INSTAGRAM_API_VERSION` | Server | Override Instagram Graph API version. |
| `INSTAGRAM_SCOPES` | Server | Override standalone Instagram Login scopes. |
| `LINKEDIN_API_VERSION` | Server | Override LinkedIn versioned REST API header. Defaults to `202605`. |
| `LINKEDIN_SCOPES` | Server | Override LinkedIn OAuth scopes. Defaults to `openid,profile,email,w_member_social`. |
| `OPENROUTER_BASE_URL` | Server | Override OpenRouter API base URL. |
| `AI_PRIMARY_PROVIDER` | Server | Force `heuristic`, `gemini`, or `openrouter`. Default is `heuristic` for local/free development. |
| `GEMINI_MODEL` | Server | Gemini model id. Defaults to `gemini-1.5-flash`. |
| `AI_MODEL_ASSISTANT` | Server | Assistant model id; must pass allowlist validation. |
| `AI_REQUEST_TIMEOUT_MS` | Server | AI provider timeout. |
| `AI_MAX_RETRIES` | Server | AI provider retry count. |

## Client Exposure Rules

Only `NEXT_PUBLIC_*` values may be referenced from client code. Server-only keys must not appear in UI bundles, route responses, logs, or localStorage/sessionStorage.

Current verification:

- Unit coverage: `tests/unit/security-no-secret-exposure.test.ts`
- Safe env key helper: `lib/server/env-security.ts`
- Runtime env validation: `lib/server/production-env.ts`

## Local Free AI Mode

Use no paid provider key for local development:

```bash
AI_PRIMARY_PROVIDER=heuristic
```

Gemini is optional:

```bash
AI_PRIMARY_PROVIDER=gemini
GEMINI_API_KEY=replace-with-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash
```

OpenRouter remains optional and is only selected when explicitly configured:

```bash
AI_PRIMARY_PROVIDER=openrouter
OPENROUTER_API_KEY=replace-with-openrouter-api-key
AI_MODEL_ASSISTANT=openai/gpt-4o-mini
```

Provider auth/config failures are recorded server-side as failed/fallback usage events and then fall back to the heuristic provider without exposing secrets.

## LinkedIn Provider

LinkedIn is optional until a workspace is ready to connect it:

```bash
LINKEDIN_CLIENT_ID=replace-with-linkedin-client-id
LINKEDIN_CLIENT_SECRET=replace-with-linkedin-client-secret
LINKEDIN_REDIRECT_URI=http://localhost:3003/api/linkedin/callback
LINKEDIN_SCOPES=openid,profile,email,w_member_social
LINKEDIN_API_VERSION=202605
```

The current provider foundation supports OAuth member connection and text-only member posts. LinkedIn organization/page publishing and media publishing require the additional LinkedIn product permissions and asset upload flow.

## Standalone Instagram Login

The Channels page uses a separate Instagram Login route for the Instagram button:

```bash
INSTAGRAM_APP_ID=replace-with-instagram-app-id
INSTAGRAM_APP_SECRET=replace-with-instagram-app-secret
INSTAGRAM_REDIRECT_URI=https://autopost-hub.vercel.app/api/instagram/callback
INSTAGRAM_SCOPES=instagram_business_basic,instagram_business_content_publish
```

Facebook Pages still use Meta/Facebook Login:

```bash
META_REDIRECT_URI=https://autopost-hub.vercel.app/api/meta/callback
META_SCOPES=pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish
```

Add both callback URLs in the Meta/Instagram dashboard. The Instagram flow requires a Business or Creator account. Facebook Page linking is still needed when using Page-backed Instagram discovery.

## Supabase Social Login

Google and GitHub login are enabled in the frontend through Supabase OAuth. Configure provider credentials in the Supabase dashboard, not in public client code.

Provider callback URL:

```text
https://<your-supabase-project>.supabase.co/auth/v1/callback
```

Allowed redirect URLs should include:

```text
https://autopost-hub.vercel.app/auth/callback
https://autopost-hub.vercel.app/auth
http://localhost:3000/auth/callback
http://localhost:3000/auth
http://localhost:3003/auth/callback
http://localhost:3003/auth
http://127.0.0.1:3137/auth/callback
http://127.0.0.1:3137/auth
```

## Stripe Billing

Paid plans are optional until Stripe is configured. Without Stripe keys, the app keeps Free plan behavior and the billing API returns `stripe_not_configured` instead of failing the app.

```bash
STRIPE_SECRET_KEY=replace-with-stripe-secret-key
STRIPE_WEBHOOK_SECRET=replace-with-stripe-webhook-secret
STRIPE_PRICE_CREATOR=price_creator_monthly
STRIPE_PRICE_PRO=price_pro_monthly
STRIPE_PRICE_AGENCY=price_agency_monthly
```

Webhook endpoint:

```text
https://autopost-hub.vercel.app/api/stripe/webhook
```

Required webhook events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```
