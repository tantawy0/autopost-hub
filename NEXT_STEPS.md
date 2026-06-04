# AutoPost Hub Next Steps

Last generated: 2026-06-04

## Recommended Slices In Order

| Order | Slice | Priority | Owner | Model/reasoning | Expected commands |
| --- | --- | --- | --- | --- | --- |
| 1 | Meta OAuth provider-success validation: connect Facebook Page and eligible Instagram Business/Creator account, publish one safe test image post, inspect attempts/audit logs. | P0 | Manual + Codex | Codex medium; manual Meta dashboard/account actions. | `npm test`, `npm run build -- --webpack`, credential-backed API/browser smoke |
| 2 | External cron runner activation: configure authenticated scheduler and worker calls for the production URL if Vercel Hobby cron is insufficient. | P0 | Manual + Codex | Codex low/medium; manual hosting cron setup. | `SMOKE_BASE_URL=https://autopost-hub.vercel.app npm run smoke:cron` |
| 3 | Full Google/GitHub consent completion: manually finish OAuth login with real accounts and verify dashboard session persistence. | P0 | Manual + Codex | Low reasoning; manual browser consent. | `SMOKE_BASE_URL=https://autopost-hub.vercel.app npm run smoke:auth` |
| 4 | AI provider production validation: verify OpenRouter model allowlist, assistant route, content-score route, and heuristic fallback logs. | P1 | Codex | Medium reasoning. | `npm test`, authenticated API smoke for `/api/ai/assistant` and `/api/ai/content-score` |
| 5 | 21st agent validation: configure 21st dashboard provider key for `my-agent`, reset chat, verify token/sandbox/thread routes. | P1 | Manual + Codex | Medium reasoning; manual dashboard/CLI credentials. | authenticated API smoke for `/api/an-token`, `/api/agent/sandbox`, `/api/agent/threads` |
| 6 | Engagement inbox MVP: add reply/action workflow on top of existing thread/message model. | P2 | Codex or Cursor | High reasoning because it touches product/API/UI. | `npm test`, `npm run lint`, `npm run build -- --webpack`, targeted E2E |
| 7 | Automation runner MVP: execute stored automation flows through background jobs with audit/retry semantics. | P2 | Codex | High reasoning. | `npm test`, `npm run lint`, `npm run build -- --webpack`, worker smoke |
| 8 | Team management UI: invitations, member roles, permission views, admin flows. | P2 | Cursor for UI + Codex for backend hardening | Medium/high reasoning. | `npm test`, `npm run lint`, `npm run build -- --webpack`, RBAC E2E |
| 9 | Advanced scheduling: recurring/smart scheduling and queue optimization. | P2 | Codex | High reasoning. | `npm test`, scheduler unit/E2E, `npm run build -- --webpack` |
| 10 | TikTok provider implementation after API access is available. | P3 | Codex | High reasoning with provider docs. | provider-specific tests, `npm test`, `npm run lint`, `npm run build -- --webpack` |

## Immediate Best Next Slice

Run a real Meta provider-success staging/production smoke. Production deploy, auth provider start, email login, cron dry-runs, linked migrations, and Playwright E2E are passing; remaining launch confidence depends on proving Meta OAuth/publishing with safe test social assets and provider-fetchable media.

## Standard Verification Commands

```bash
npm test
npm run lint
npm run build -- --webpack
```

## Credential-Backed Verification Commands

```bash
npx supabase db push --linked
npm run setup:e2e
npm run test:e2e
```

Do not print real secret values in logs, screenshots, reports, or chat output.
