# AutoPost Hub Next Steps

Last generated: 2026-05-26

## Recommended Slices In Order

| Order | Slice | Priority | Owner | Model/reasoning | Expected commands |
| --- | --- | --- | --- | --- | --- |
| 1 | Staging credential smoke: verify Supabase migrations, `post-images`, auth, autosave, media upload, scheduler/worker health. | P0 | Manual + Codex | Codex medium for scripting/reporting; manual for dashboards/secrets. | `npx supabase db push --linked`, `npm test`, `npm run lint`, `npm run build -- --webpack` |
| 2 | Meta OAuth staging validation: connect Facebook Page and Instagram Business account, publish one image post, inspect attempts/audit logs. | P0 | Manual + Codex | Codex medium; manual Meta dashboard/account actions. | `npm test`, `npm run build -- --webpack`, credential-backed API/browser smoke |
| 3 | Cron runner setup: configure authenticated scheduler and worker calls; confirm due posts and background jobs process safely. | P0 | Manual + Codex | Codex low/medium; manual hosting cron setup. | `curl` protected health/process endpoints, `npm test` |
| 4 | Browser E2E activation: enable Playwright with real test user and stable staging dataset. | P1 | Codex | Medium reasoning. | `E2E_START_SERVER=1 E2E_RUN_BROWSER=1 E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e` |
| 5 | Production deployment readiness update: sync docs after staging validation, update stale blockers in production docs/checklists. | P1 | Codex | Low reasoning. | `npm test`, `npm run lint`, `npm run build -- --webpack` |
| 6 | AI provider production validation: verify OpenRouter model allowlist, assistant route, content-score route, and fallback logs. | P1 | Codex | Medium reasoning. | `npm test`, authenticated API smoke for `/api/ai/assistant` and `/api/ai/content-score` |
| 7 | 21st agent validation: configure 21st dashboard provider key for `my-agent`, reset chat, verify token/sandbox/thread routes. | P1 | Manual + Codex | Medium reasoning; manual dashboard/CLI credentials. | authenticated API smoke for `/api/an-token`, `/api/agent/sandbox`, `/api/agent/threads` |
| 8 | Engagement inbox MVP: add reply/action workflow on top of existing thread/message model. | P2 | Codex or Cursor | High reasoning because it touches product/API/UI. | `npm test`, `npm run lint`, `npm run build -- --webpack`, targeted E2E |
| 9 | Automation runner MVP: execute stored automation flows through background jobs with audit/retry semantics. | P2 | Codex | High reasoning. | `npm test`, `npm run lint`, `npm run build -- --webpack`, worker smoke |
| 10 | Team management UI: invitations, member roles, permission views, admin flows. | P2 | Cursor for UI + Codex for backend hardening | Medium/high reasoning. | `npm test`, `npm run lint`, `npm run build -- --webpack`, RBAC E2E |
| 11 | Advanced scheduling: recurring/smart scheduling and queue optimization. | P2 | Codex | High reasoning. | `npm test`, scheduler unit/E2E, `npm run build -- --webpack` |
| 12 | TikTok provider implementation after API access is available. | P3 | Codex | High reasoning with provider docs. | provider-specific tests, `npm test`, `npm run lint`, `npm run build -- --webpack` |

## Immediate Best Next Slice

Run a real staging credential smoke. The codebase is structurally ready, but production confidence now depends on proving the external seams: Supabase project, storage bucket/policies, Meta OAuth/publishing, cron bearer auth, and AI provider credentials.

## Standard Verification Commands

```bash
npm test
npm run lint
npm run build -- --webpack
```

## Credential-Backed Verification Commands

```bash
npx supabase db push --linked
E2E_START_SERVER=1 E2E_RUN_BROWSER=1 E2E_EMAIL=<test-user> E2E_PASSWORD=<test-password> npm run test:e2e
```

Do not print real secret values in logs, screenshots, reports, or chat output.
