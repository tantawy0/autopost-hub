# Backend Architecture Governance

**Version**: 1.0.0 | **Ratified**: 2026-05-22 | **Last Reviewed**: 2026-05-25

## Purpose

This document establishes the architectural principles, service boundaries, data ownership rules, and operational constraints for AutoPost Hub's backend. It is a governance document defining non-negotiable patterns for all server-side code contributions.

## Core Architectural Principles

### I. Server-Only Credential Isolation

**MANDATE**: All secrets, provider tokens, and service credentials MUST be stored and used exclusively on the server. Client-side code MUST NOT access, request, or transmit private keys, OAuth secrets, or service-role API credentials.

**Enforcement**:
- All provider OAuth tokens stored in Supabase `oauth_tokens` table, encrypted
- Meta App Secret kept in `META_APP_SECRET` env var, only referenced in `/api/meta/*` handlers
- Service-role Supabase key kept in `SUPABASE_SERVICE_ROLE_KEY` env var, used only in route handlers
- Client code uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` only for public, RLS-protected operations
- Token refresh/rotation logic isolated in `lib/oauth-tokens.ts`

**Verification**: Code review checklist item for all API routes and `lib/server/*` modules.

### II. User Ownership & Data Scoping

**MANDATE**: Every record created by or on behalf of a user MUST be owned by that user's `user_id`. All database reads and writes MUST filter by authenticated user context. Workspace/team concepts do not override user-level isolation.

**Enforced Data Scopes**:
- `posts` table: `user_id` column, RLS policy `user_id = auth.uid()`
- `connected_accounts` table: `user_id` column, RLS policy `user_id = auth.uid()`
- `media_assets` table: `user_id` column, RLS policy `user_id = auth.uid()`
- `publishing_attempts` table: filtered via joined post ownership, not direct user_id
- `oauth_tokens` table: `user_id` column, RLS policy `user_id = auth.uid()`

**Server-Side Validation**: Every route handler MUST validate authenticated user via `getServerUser()` before querying.

**Verification**: Supabase RLS policy audit in `docs/supabase-rls-checklist.md` on each schema change.

### III. Idempotent Publishing & Terminal State Integrity

**MANDATE**: Publishing actions MUST be idempotent. Once a post reaches a terminal state (Published, Partially Published, or Failed), updates MUST NOT change its status unless explicitly triggered by a new publish action or recovery workflow.

**State Diagram** (enforced in `lib/publishing.ts`):

```
Draft → Scheduled → Publishing → Terminal (Published|Partially Published|Failed)
  ↓                                                  ↓
  └──────────────────────────────────────────────────┘
           (can delete while in Draft or Failed)
```

**Publishing Attempt Outcomes**:
- One `publishing_attempt` record per (post, destination) pair
- Status flows: Pending → Publishing → (Succeeded|Failed|Skipped)
- Each attempt stores `finishedAt` timestamp and `message` (error or provider ID)
- If any destination succeeds, post status = "Published"; if some fail, "Partially Published"; all fail = "Failed"

**Idempotency Guarantees**:
- Publish endpoint checks post status before re-publishing
- External provider API calls use idempotency keys where available (e.g., Meta API)
- Audit log captures every publish attempt, not just successful ones

**Verification**: E2E tests for publish, re-publish, and failure recovery in `tests/e2e/publishing.spec.ts`.

### IV. Provider Integration Boundaries

**MANDATE**: Each platform (Facebook, Instagram, TikTok) has isolated provider code. Changes to one provider MUST NOT affect routing, validation, or error handling for another.

**Provider Modules**:
- `lib/providers/facebook.ts` — Facebook Page publishing only
  - Requires: Page ID, long-lived page access token
  - Capabilities: Single/album photo posts, feed captions
  - Errors: Custom error mapping → user-facing messages
  - Retries: Configured per-error type (401 no-retry, 503 retry-exponential)

- `lib/providers/instagram.ts` — Instagram Business account publishing only
  - Requires: Instagram Business Account ID, long-lived user access token + business scopes
  - Capabilities: Single/carousel/Reel container creation + publication
  - Errors: Custom error mapping → user-facing messages
  - Rate limits: Enforced per token, cached locally

- `lib/providers/tiktok.ts` — Placeholder (no publishing)
  - Account storage as "TikTok" type
  - OAuth flow stubbed
  - Publishing explicitly blocked with user-facing "not yet available" message

**Unsupported Operations**: If a platform cannot perform an action (e.g., TikTok video posts), the system MUST:
1. Block the action in validation (before Supabase write)
2. Show clear UI feedback ("TikTok doesn't support this yet")
3. Log the attempt in audit trail
4. Never silently skip the action

**Verification**: Each provider has dedicated E2E test suite; mock mode available for local testing without credentials.

### V. Route Handler Patterns

**MANDATE**: All `/api/*` route handlers follow the same request validation, error handling, and response pattern.

**Pattern (Enforced in Scaffolding)**:

```typescript
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Validate user authentication
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Parse and validate input
    const body = await req.json();
    const input = inputSchema.parse(body);

    // 3. Call domain service (isolated from HTTP)
    const result = await serviceFunction(user.id, input);

    // 4. Return structured response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // 5. Log error with context (no secrets)
    await writeAuditLog(user?.id, "handler_error", { path, error: error.message });

    // 6. Return safe error response
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ProviderError) {
      return NextResponse.json({ error: "Publishing failed" }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Requirements**:
- `import "server-only"` at top (enforces server-only usage)
- User authentication check before any business logic
- Input schema validation with Zod
- Domain logic isolated from HTTP concerns
- Error mapping: Never expose internal details, provider errors, or credentials
- Audit logging for all user-facing actions
- Consistent JSON response shape

### VI. Database Migrations & Schema Governance

**MANDATE**: All schema changes go through numbered Supabase migrations. Migrations are applied in sequence and versioned with timestamps. Once applied to production, a migration is immutable.

**Migration Rules**:
- Filename format: `YYYYMMDDOONN_description.sql` (e.g., `202605220001_social_saas_schema.sql`)
- One logical change per migration
- Includes both schema (CREATE/ALTER) and RLS policy statements
- Includes down-migration comments (for rollback documentation)
- Applied in order: `supabase/migrations/` directory
- Tested against local Supabase before commit

**RLS Policy Requirements**:
- Every table with user data MUST have RLS enabled
- Default policy: DENY all until explicitly granted
- SELECT policy: `auth.uid() = user_id` (or equivalent for scoped data)
- INSERT policy: Validate `user_id` matches authenticated user
- UPDATE policy: Prevent user_id changes; other columns conditional
- DELETE policy: User can delete own records only

**Verification**: `supabase link` + `supabase db pull` for local validation; schema diffs reviewed in PRs.

### VII. Token Management & Expiration

**MANDATE**: OAuth tokens from external providers are refreshed transparently. If a token expires, the system MUST prompt the user to reconnect rather than fail silently.

**Token Lifecycle**:
1. **Acquisition**: Meta OAuth callback stores token in `oauth_tokens` table with `expires_at` timestamp
2. **Refresh**: Before publishing to a platform, `refreshAccountTokenIfNeeded()` checks expiration
3. **Rotation**: If refresh fails (revoked account), `connected_accounts.status` → "Expired" or "Revoked"
4. **User Prompt**: UI shows "Reconnect Required" banner; redirects to `/api/meta/login`
5. **Audit**: Every refresh attempt logged with `status` (success/expired/revoked)

**Encryption**: Token ciphertext stored in `oauth_tokens.token_ciphertext`; encryption key from env var, never logged.

**Verification**: E2E test for token refresh on stale token; manual test for revoked account reconnection flow.

### VIII. Audit & Observability

**MANDATE**: All user-initiated actions and system errors MUST be logged to `audit_logs` table with sufficient context for debugging.

**Audit Log Entries**:
- User action (e.g., "post_published", "channel_connected")
- Timestamp, user_id, action, metadata (post_id, platform, result)
- No secrets, provider tokens, or passwords
- Error logs include: error type, message, stack trace (server-side only)

**Observability Requirements**:
- All errors surfaced in UI via toast notifications (Sonner)
- Provider errors mapped to user-friendly messages (e.g., "Account authorization expired")
- Failed publishing attempts show retry/reconnect options
- No 500 errors without audit log entry

**Verification**: Audit log spot-checks on each release; error tracking integration (Sentry, LogRocket) for production.

## Service Boundaries

### Supabase (Database & Storage)

**Responsibility**: Persisted user data, authentication context, RLS enforcement

**What Belongs Here**:
- Posts, media assets, connected accounts, publishing attempts
- OAuth tokens (encrypted)
- Audit logs
- User session data

**What Doesn't Belong Here**:
- Transient publishing state (use in-memory or job queue)
- Provider credentials (except encrypted tokens)
- Large file uploads (use Storage bucket)

### Provider Services (Meta, Instagram, TikTok)

**Responsibility**: Account authorization, content publishing, account linking

**Flow**:
1. User clicks "Connect Facebook" → `/api/meta/login` initiates OAuth
2. Provider redirects to `/api/meta/callback` → token stored, account record created
3. Publishing triggers `/api/posts/[id]/publish-now` → provider service called
4. Success/failure recorded in `publishing_attempts`

**Error Handling**:
- Provider unavailable → "Temporarily unavailable, retry later"
- Invalid token → "Account connection expired"
- Rate limit → "You're posting too quickly, try again in X minutes"
- Unsupported → "This platform doesn't support this content type"

### Scheduler (Cron-Triggered)

**Responsibility**: Processing due-scheduled posts at their scheduled time

**Endpoint**: `/api/scheduler/process-due-posts` (cron job)

**Validation**:
- `CRON_SECRET` header required (prevents unauthorized calls)
- Fetches posts with `status = "Scheduled"` and `scheduled_for <= now()`
- Calls publishing service for each post
- Updates post status based on outcome

**Idempotency**: Scheduled times may drift by seconds; jobs track `last_processed_at` to prevent re-runs.

## Type System & Contracts

### Core Types (Non-Negotiable)

All backend operations MUST use these types:

- **Platform** enum: "Facebook" | "Instagram" | "TikTok"
- **PostStatus** enum: "Draft" | "Scheduled" | "Published" | "Partially Published" | "Failed"
- **ConnectedAccountStatus** enum: "Connected" | "Disconnected" | "Expired" | "Revoked" | "Unauthorized" | "Placeholder"
- **PublishingAttemptStatus** enum: "Pending" | "Publishing" | "Succeeded" | "Failed" | "Skipped"
- **MediaType**: "image" | "video" | "carousel" | "unknown"

**DTO Contracts**:
- Input validation via Zod schemas (e.g., `publishPostSchema`)
- Output as DTOs (e.g., `PostCardDTO`, `PublishingAttemptDTO`)
- No "unknown" fields in responses; deprecate via version field

### Validation Rules

**Post Creation**:
- Caption max length: 2200 chars (Meta limit)
- First comment max length: 2200 chars
- Media count: 1–20 items
- Platform selection: At least one
- Scheduled time (if Scheduled): Must be >= now + 10 minutes

**Account Connection**:
- Platform must be valid enum
- OAuth token must have required scopes
- Account must have publish permission (for Facebook Pages / Instagram Business)
- Status must start as "Connected"

## Amendment Procedures

This architecture document supersedes conflicting local conventions. Changes MUST follow this process:

1. **Proposal**: Open issue describing architectural change, with rationale
2. **Discussion**: Core team reviews against Constitution principles
3. **Update**: Modify this document with version bump (semantic versioning)
4. **Implementation**: Update scaffolding, templates, and sample code
5. **Rollout**: Document migration path for existing routes

**Versioning**:
- MAJOR: Breaking change to core principles (server secrets, RLS, publishing idempotency)
- MINOR: New service boundary or pattern added (new provider, new table scope)
- PATCH: Clarification or refinement without changing obligations

**Current Version**: 1.0.0 (established 2026-05-22, ratified with Constitution v1.0.0)

## Audit & Compliance Checklist

Before shipping backend changes, verify:

- [ ] All `/api` routes validate authenticated user context
- [ ] No credentials, tokens, or secrets logged or returned to client
- [ ] Supabase RLS policies reviewed (all user data scoped by `user_id`)
- [ ] Publishing changes preserve idempotency (no duplicate posts)
- [ ] Provider errors mapped to safe user messages
- [ ] New migrations numbered sequentially and tested locally
- [ ] Audit logs capture user action with metadata
- [ ] E2E tests cover happy path and error cases
- [ ] `npm run lint` passes with no warnings
- [ ] `npm run build` completes successfully
- [ ] Related docs (README, quickstart, API contract) updated

## Governance & Enforcement

This document is enforced through:
1. **Code Review**: Checklist above mandatory for PRs
2. **Architecture Review**: Quarterly review of deviations
3. **Constitution**: Core Principles always supersede this document if conflict exists
4. **Testing**: E2E tests validate compliance for user journeys

**Approval Authority**: Architecture lead + one senior developer

**Questions/Clarifications**: Open issue in project repository or contact architecture lead.
