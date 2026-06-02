# Research: Social Publishing SaaS Transformation

## Decision: Use Next.js App Router route handlers for OAuth, publishing, and scheduler entrypoints

**Rationale**: Local Next.js 16 docs confirm route handlers belong under the
`app` directory, support standard HTTP methods, and are not cached by default
for non-GET methods. This fits Meta OAuth callbacks, scheduler POST requests,
and publish-now operations without introducing a separate backend service.

**Alternatives considered**:
- Separate Node/Express backend: rejected because it adds deployment and auth
  surface area without a clear first-release need.
- Client-only provider calls: rejected because provider secrets and tokens must
  never be exposed to browser clients.
- Pages Router API routes: rejected because the app is already App Router and
  Next.js docs state App Router route handlers replace API routes for `app/`.

## Decision: Introduce a server-only data access layer for privileged workflows

**Rationale**: Next.js data security docs recommend a Data Access Layer that runs
only on the server, performs authorization checks, and returns safe DTOs. The
feature includes provider tokens, service-role operations, publishing attempts,
and ownership-sensitive mutations, so these must be isolated from Client
Components.

**Alternatives considered**:
- Continue direct Supabase client calls in page components: rejected for
  privileged OAuth/publishing flows and because it repeats ownership checks.
- Server Actions for all mutations: deferred; route handlers better match OAuth
  callback and scheduler entrypoints, and client forms can still call thin APIs
  or public Supabase operations protected by RLS.

## Decision: Keep public Supabase anon client for browser auth and add a server client for provider/publishing logic

**Rationale**: Existing auth uses Supabase on the client. The new plan preserves
that path for public-anon operations while adding a server-only client for token
exchange, connected-account persistence, publishing attempts, and scheduler
processing. This preserves the constitution's user-ownership requirements while
keeping secrets out of the browser.

**Alternatives considered**:
- Move all data access server-side in one pass: rejected as too large for the
  transformation and likely to disrupt existing working auth flows.
- Store provider tokens in public client-managed records: rejected because token
  secrecy is a hard requirement.

## Decision: Model publishing as overall post status plus per-destination attempts

**Rationale**: The clarified spec requires Published when all destinations
succeed, Failed when none succeed, and Partially Published for mixed outcomes.
Per-destination attempts make retries, observability, and user-visible error
messages precise without corrupting the overall lifecycle.

**Alternatives considered**:
- Single status and single error message on posts: rejected because it cannot
  represent Facebook success plus Instagram failure.
- Split every post into destination-specific posts: rejected because it would
  make the composer, calendar, and draft lifecycle harder to understand.

## Decision: Use a Vercel-Cron-compatible scheduler route for due post processing

**Rationale**: A server route can be called by Vercel Cron, local scripts, or a
future Supabase Edge Function while keeping publishing logic in one service. It
also avoids the current dashboard-load side effect and allows request-level
authorization with a scheduler secret.

**Alternatives considered**:
- Supabase Edge Function first: viable later, but it would duplicate provider
  logic outside the app during this first release.
- Client interval polling: rejected because it is unreliable and cannot safely
  use server-only provider secrets.

## Decision: Add destination-aware media validation before scheduling and publishing

**Rationale**: The first release must support any provider-supported media type.
Facebook Pages and Instagram Business accounts do not share identical media
rules, so validation must run per selected destination before content enters the
queue and again before publishing.

**Alternatives considered**:
- Limit release to single-image posts: rejected by clarification.
- Validate only at publishing time: rejected because users would schedule
  content that is predictably invalid.

## Decision: Use Playwright for end-to-end verification

**Rationale**: Next.js docs recommend Playwright for E2E testing and note that it
can run against production builds with a web server. This feature's highest-risk
requirements are user journeys across auth, scheduling, channel connection,
media validation, and publishing outcomes, which are best tested through the
browser.

**Alternatives considered**:
- Unit tests only: rejected because they do not verify route/page integration.
- Manual-only checklist: rejected because constitution requires automated tests
  for auth, data isolation, scheduling transitions, destructive actions, and
  platform integration behavior.

## Decision: Use a dark, tokenized SaaS design system with purposeful motion

**Rationale**: The UI/UX Pro Max design-system lookup recommends a vibrant,
block-based SaaS style, strong contrast, 4/8 spacing rhythm, SVG icons, visible
focus states, 150-300ms motion, and reduced-motion support. The plan adapts this
to the current dark dashboard product, using semantic tokens instead of ad hoc
hex values in every component.

**Alternatives considered**:
- Keep the current page-by-page styling: rejected because repeated layouts,
  arbitrary radii, and duplicated card patterns make the product feel less
  cohesive.
- Marketing-style landing layout: rejected because the requested first screen is
  the actual dashboard workflow.

## Decision: Add Sonner as an explicit dependency if missing from package metadata

**Rationale**: Existing code imports Sonner and the spec requires replacing all
blocking browser dialogs with non-blocking notifications. Package metadata must
match runtime imports so build and install are reproducible.

**Alternatives considered**:
- Replace Sonner with hand-rolled toast state: rejected because the existing app
  already uses Sonner patterns and a shared Toaster.
