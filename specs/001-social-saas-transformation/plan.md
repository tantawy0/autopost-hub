# Implementation Plan: Social Publishing SaaS Transformation

**Branch**: `001-social-saas-transformation` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-social-saas-transformation/spec.md`

## Summary

Transform AutoPost Hub from a prototype social scheduling dashboard into a
production-grade social publishing SaaS experience. The implementation keeps the
current single-user ownership model, replaces ad hoc client-only behavior with
validated Supabase-backed workflows, adds real Meta account authorization and
live publishing for eligible Facebook Pages and Instagram Business accounts,
keeps TikTok as a placeholder, and introduces per-destination publishing
outcomes for multi-destination posts.

The technical approach is incremental: first establish typed domain models,
server-only provider/publishing services, schema/RLS migrations, and reusable UI
foundation; then refactor each existing route around those shared contracts.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2.4, Next.js 16.2.6 App Router

**Primary Dependencies**: Next.js, React, Supabase JS, Tailwind CSS 4,
lucide-react, Sonner, Framer Motion, Playwright

**Storage**: Supabase PostgreSQL tables for posts, media assets, connected
accounts, and publishing attempts; Supabase Storage `post-images` bucket

**Testing**: `npm run lint`, `npm run build`, Playwright E2E tests for auth,
dashboard, composer, calendar/drafts/published, channels, account isolation,
media validation, and publishing outcomes

**Target Platform**: Web browser through Next.js App Router; server-side route
handlers for OAuth, publishing, and scheduler entrypoints

**Project Type**: Single Next.js web application

**Performance Goals**: Dashboard and list views remain responsive with 100 posts
and 10 connected accounts per user; async actions show feedback within 300ms;
primary scheduling workflow completes in under 3 minutes for 90% of test users

**Constraints**: Single-user account ownership only; no teams/workspaces; Meta
secrets and provider tokens stay server-side; existing auth and RLS must remain
intact; TikTok is non-publishing placeholder; destination/media compatibility
must be validated before scheduling and publishing

**Scale/Scope**: Existing 7 user-facing routes plus new server route handlers,
Supabase migrations, shared UI/domain libraries, and E2E test coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Authenticated User Ownership**: PASS. The plan uses one owning `user_id` for
  posts, media assets, connected accounts, and publishing attempts. All reads
  and writes must use authenticated-user filters plus Supabase RLS policies.
- **Scheduling State Integrity**: PASS. The data model defines Draft, Scheduled,
  Published, Partially Published, and Failed as explicit states with
  destination-level publishing attempts and idempotent terminal-state handling.
- **Verifiable User Journeys**: PASS. Each user story maps to Playwright E2E
  coverage plus quickstart manual checks for provider setup and live Meta
  behavior.
- **Platform Integration Boundaries**: PASS. Facebook Pages and Instagram
  Business accounts are live publishing targets; TikTok is a placeholder. Media
  compatibility, account validity, and per-destination outcomes are modeled
  separately.
- **Simple, Observable Operations**: PASS WITH JUSTIFICATION. New Framer Motion
  and Playwright dependencies are justified in Complexity Tracking by explicit
  UI and verification requirements. Server-side route handlers are used instead
  of adding a separate backend service.
- **Next.js 16 Compliance**: PASS. Consulted local docs:
  `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`,
  `05-server-and-client-components.md`,
  `02-guides/environment-variables.md`,
  `02-guides/data-security.md`, and `02-guides/testing/playwright.md`.

## Project Structure

### Documentation (this feature)

```text
specs/001-social-saas-transformation/
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/
    api-contract.md
```

### Source Code (repository root)

```text
app/
  api/
    meta/login/route.ts
    meta/callback/route.ts
    scheduler/process-due-posts/route.ts
  auth/page.tsx
  calendar/page.tsx
  channels/page.tsx
  create-post/page.tsx
  drafts/page.tsx
  edit-post/[id]/page.tsx
  layout.tsx
  page.tsx
  published/page.tsx
components/
  AuthGuard.tsx
  LoadingButton.tsx
  app-shell/
  dashboard/
  posts/
  channels/
  ui/
lib/
  supabase.ts
  supabase-server.ts
  auth.ts
  posts.ts
  channels.ts
  publishing.ts
  providers/
    meta.ts
    facebook.ts
    instagram.ts
    tiktok.ts
  validation/
    media.ts
    scheduling.ts
supabase/
  migrations/
tests/
  e2e/
```

**Structure Decision**: Keep the single app structure and add focused server
route handlers plus shared `lib/` services. Existing pages stay in place but
move duplicated logic into reusable components and domain services. Supabase SQL
migrations live under `supabase/migrations/`; tests live under `tests/e2e/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New dependency: Framer Motion | The spec requires smooth SaaS animations and UI polish across page transitions, cards, empty states, and loading states. | CSS-only transitions cannot reliably cover route/list orchestration, exit states, and reduced-motion-aware motion components at the requested quality level. |
| New dev dependency: Playwright | Constitution requires automated coverage for auth, data isolation, scheduling/status transitions, destructive actions, and integration behavior. | Manual-only verification would violate the constitution for high-risk stateful workflows. |
| New scheduler route | Due posts must publish without relying on dashboard visits, and publishing must be idempotent and observable. | Existing client-side auto-publish prototype only runs when the dashboard loads and cannot safely handle secrets or reliable per-destination outcomes. |

## Post-Design Constitution Re-check

- **Authenticated User Ownership**: PASS. `data-model.md` defines owning
  `user_id` and RLS requirements for every user-owned entity.
- **Scheduling State Integrity**: PASS. `data-model.md` defines post statuses,
  transitions, terminal-state idempotency, and per-destination attempts.
- **Verifiable User Journeys**: PASS. `quickstart.md` and research decisions
  require Playwright coverage for auth, data isolation, scheduling transitions,
  destructive actions, and integration outcomes.
- **Platform Integration Boundaries**: PASS. `contracts/api-contract.md`
  separates Meta OAuth, scheduler processing, publish-now behavior, disconnect
  behavior, and TikTok placeholder constraints.
- **Simple, Observable Operations**: PASS WITH JUSTIFICATION. Complexity entries
  cover new dependency and scheduler decisions; contracts require safe error
  codes/messages without token exposure.
- **Next.js 16 Compliance**: PASS. Plan cites local Next.js 16 docs consulted
  for route handlers, server/client separation, environment variables, data
  security, and Playwright.
