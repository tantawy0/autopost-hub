# ECC Full App Audit

Last updated: 2026-06-03

## Scope

This audit used the installed ECC skills for security review, backend patterns, API design, migrations, and E2E readiness. It covered the application tree from `app/`, `components/`, `lib/`, `lib/server/`, `lib/providers/`, `supabase/migrations/`, `tests/`, `agents/`, and production docs.

No real values from `.env.local` were printed or copied into this report.

## Executive Summary

AutoPost Hub is production-shaped, not just a mock dashboard. The strongest areas are Supabase-backed auth/RBAC, publishing lifecycle, media storage validation, queue/worker foundations, Meta/Facebook publishing, AI fallback behavior, and copied ZIP UI activation.

The highest priority before broader public launch is not another UI pass. It is credential-backed production verification: OAuth callbacks, real Facebook/Instagram publish tests, scheduler/worker cron execution, Stripe live/sandbox checkout, and E2E account coverage.

## App Surface Checked

| Area | Status | Notes |
| --- | --- | --- |
| Landing and auth | Good | Active ZIP-style landing and sign-in UI are in place. |
| Authenticated shell | Good | `/dashboard`, `/create`, `/calendar`, `/queue`, `/published`, `/analytics`, `/channels`, `/media`, `/settings`, and `/ai-agent` use copied UI shell. |
| Legacy route redirects | Improved | `/create-post` redirects to `/create`; `/drafts` redirects to `/queue`. |
| Composer | Improved | Active copied composer uses server autosave and real post editing. Local draft persistence was removed. |
| Channels | Improved | Channel cards now preserve multiple real connected accounts instead of collapsing to one account per platform. |
| API routes | Good | Sensitive routes use bearer auth, cron auth, OAuth state, or webhook signature. |
| OAuth | Partial | Meta and LinkedIn foundations exist; Meta requires dashboard/app-review constraints for public users. |
| Publishing | Good foundation | Facebook publishing works; Instagram discovery/publishing requires linked IG Business/Creator assets. |
| Queue/worker | Good foundation | Cron-protected worker/scheduler endpoints and retry/idempotency foundations exist. |
| Media/storage | Good | Public `post-images` bucket strategy, 200 MB validation, scoped paths, and stored media records exist. |
| Analytics | Partial | Ingestion/rollup foundations exist; provider-backed scheduled sync needs staging proof. |
| AI | Good fallback | Heuristic mode works without paid APIs; OpenRouter/Gemini are optional with fallback. |
| 21st agent | Safer | Missing config and provider failures now avoid exposing exact secret names or key-shaped values. |
| Billing | Improved | Plan metadata, Stripe route foundations, Owner/Admin billing routes, usage reporting, AI request limits, OAuth channel limits, scheduled-post limits, and media-storage limits exist; live/sandbox checkout still needs credential-backed verification. |
| Tests | Good unit coverage | Unit tests cover auth, autosave, lifecycle, analytics idempotency, AI fallback, media, Meta diagnostics, security exposure. Browser E2E remains env-gated. |

## Security Findings And Fixes

| Finding | Severity | Status | Resolution |
| --- | --- | --- | --- |
| Unsafe HTML rendering in copied text animation | High | Fixed | Removed `dangerouslySetInnerHTML` from `TextScramble`. |
| Client-side draft localStorage persistence | High | Fixed | Removed `autopost:composer-draft`; composer relies on server autosave. |
| 21st/agent error messages could reveal exact config names or key-shaped provider values | Medium | Fixed | Added redaction and safer setup hints. |
| Security headers missing | Medium | Fixed | Added baseline `nosniff`, referrer, frame, and permissions headers. |
| Channels UI collapsed multiple connected accounts by platform | Medium | Fixed | All connected accounts now render; disconnected placeholders appear only for missing platforms. |
| Old ZIP/legacy routes could show stale UI | Medium | Partially fixed | `/drafts` redirects to `/queue`; active edit route now uses copied composer. Legacy inactive components remain for cleanup. |
| CSP not enforced | Medium | Open | Needs a separate asset/script inventory because 21st SDK and framework inline styles can break under a strict CSP. |
| Dependency audit vulnerabilities | Medium | Improved | Removed unused 21st React/Next and AI SDK client dependencies; remaining audit issue is upstream Next/PostCSS. |
| Full browser E2E coverage | Medium | Open | Requires `E2E_RUN_BROWSER=1`, test user credentials, and a running app/server. |

## Dependency Security Notes

`npm audit --omit=dev --audit-level=moderate` previously reported 11 vulnerabilities through unused 21st React/Next and AI SDK client packages. Those unused dependencies were removed while keeping the active `@21st-sdk/agent` and `@21st-sdk/node` integration.

The remaining audit report is:

- `postcss <8.5.10` through the current stable Next dependency tree.

The safe fix is not `npm audit fix --force`, because npm suggests a breaking and incorrect Next downgrade path. Treat this as a P1 supply-chain slice: upgrade Next when a stable release carries PostCSS `8.5.10` or newer, then run the full app build and browser smoke tests.

## Backend Architecture Review

| Layer | Assessment |
| --- | --- |
| API routes | Mostly thin; routes delegate to `lib/` and `lib/server/` services. |
| Auth/RBAC | Strong foundation using bearer auth, workspace roles, permission checks, and audit logs. |
| Data isolation | Supabase RLS and owner/workspace scoping are present across core tables and storage. |
| OAuth tokens | Encrypted storage and reconnect flags exist; token refresh job foundation exists. |
| Publishing lifecycle | Draft, scheduled, publishing, published, partially published, failed, attempts, and retry logic are represented. |
| Workers/jobs | Queue primitives, stale release, idempotency, retry policies, and handlers are present. |
| Analytics | Idempotent ingestion receipts and rollups are present, but real provider sync needs live checks. |
| Billing | Good foundation; checkout/portal routes are Owner/Admin-only and rate-limited. Plan usage/limits are enforced for AI requests, channel OAuth, scheduled-post saves, and media uploads, with usage exposed through billing status. Full Stripe sandbox verification remains. |

## Frontend/Product Logic Review

| Area | Assessment |
| --- | --- |
| Shell and navigation | Active main routes use copied UI shell; no old green shell is active on the main app routes. |
| Loading states | Active pages use copied skeletons or null auth guard, not the old full-screen green loader. |
| Composer destination logic | Multiple destinations per platform are preserved for publish payloads; preview tabs dedupe by platform only for preview. |
| Channels | Fixed to show every real connected account, including multiple Facebook Pages. |
| Empty states | Present but should be made more action-aware after the backend launch checks. |
| Mobile | Copied shell has mobile bottom nav; full visual regression should be run with Playwright once E2E credentials are available. |

## Open Production Risks

| Priority | Risk | Owner | Next Action |
| --- | --- | --- | --- |
| P0 | Real OAuth callback/sign-in drift between Supabase, Google, GitHub, and Vercel domains | Manual + Codex | Verify dashboard URLs and run browser E2E login. |
| P0 | Meta app permissions and IG Business linkage | Manual + Codex | Test with safe Page and linked IG Business/Creator account. |
| P0 | Cron execution on production hosting | Manual + Codex | Configure external cron or paid Vercel cron and verify protected endpoints. |
| P1 | Remaining Next/PostCSS audit issue | Codex | Upgrade Next when a stable patched line is available; run full tests/build/browser smoke. |
| P1 | Stripe checkout/portal/webhook production smoke | Manual + Codex | Add Stripe envs and run sandbox checkout/webhook end-to-end. |
| P1 | Remaining plan limits | Codex | Team-member enforcement should be added when invite/member management is expanded. |
| P1 | CSP hardening | Codex | Add report-only CSP first, collect violations, then enforce. |
| P2 | Legacy inactive component cleanup | Codex | Remove old non-copied UI components after confirming no route imports them. |

## Recommended Roadmap

| Slice | Priority | Owner | Outcome | Verification |
| --- | --- | --- | --- | --- |
| Production auth/OAuth smoke | P0 | Manual + Codex | Google/GitHub login, Supabase callback, session persistence, no login loops. | `npm run test:e2e` with credentials. |
| Meta production publishing smoke | P0 | Manual + Codex | Facebook Page publish, IG discovery diagnostics, safe IG publish if eligible. | Real safe test Page/account. |
| Cron and worker launch | P0 | Manual + Codex | Due scheduled posts publish without local browser open. | Worker/scheduler health and due-post test. |
| Remaining dependency security upgrade | P1 | Codex | Clear upstream Next/PostCSS audit once stable patched Next is available. | `npm audit`, `npm test`, `npm run build -- --webpack`. |
| Stripe plans and limits | P1 | Codex + Manual | Free/paid plan checkout, webhook, portal, and remaining team-member limits. | Stripe sandbox webhook and route tests. |
| Engagement inbox MVP | P1 | Codex | Stored comments/threads, statuses, saved replies foundation. | Unit + E2E gated tests. |
| Approval workflow MVP | P1 | Codex | Draft -> review -> approved -> scheduled workflow. | Unit + UI tests. |
| Analytics top posts | P1 | Codex | Top-performing posts and best-time signals from real rollups. | Provider sync smoke + unit tests. |
| Automation runner MVP | P2 | Codex | RSS, evergreen, failed retry, and webhook trigger foundation. | Worker tests. |

## Audit Conclusion

The product is moving in the right direction: real backend foundations exist, the copied UI is active, and the app is no longer just a mock scheduler. The next major value jump should be production activation: verified auth, verified OAuth, verified cron, verified publishing, verified billing, and supply-chain cleanup.
