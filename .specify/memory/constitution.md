<!--
Sync Impact Report
Version change: unratified template -> 1.0.0
Modified principles:
- Template Principle 1 -> I. Authenticated User Ownership
- Template Principle 2 -> II. Scheduling State Integrity
- Template Principle 3 -> III. Independently Verifiable User Journeys
- Template Principle 4 -> IV. Explicit Platform Integration Boundaries
- Template Principle 5 -> V. Simple, Observable Operations
Added sections:
- Product Constraints
- Development Workflow
Removed sections:
- None
Templates requiring updates:
- updated: .specify/templates/plan-template.md
- updated: .specify/templates/spec-template.md
- updated: .specify/templates/tasks-template.md
- reviewed: .specify/templates/commands/ (directory not present)
- updated: README.md
- reviewed: AGENTS.md and CLAUDE.md (no principle references requiring change)
Other files updated:
- updated: .specify/extensions/git/scripts/powershell/initialize-repo.ps1 (ASCII hook output)
Follow-up TODOs:
- None
-->

# AutoPost Hub Constitution

## Core Principles

### I. Authenticated User Ownership
All posts, channels, media references, schedules, drafts, and publish history MUST be
scoped to the authenticated user. Database reads and writes MUST filter by user id or
rely on equivalent Supabase Row Level Security, and client code MUST never use
service-role credentials or expose private secrets. Features that touch user data MUST
define how cross-user access is prevented and verified.

Rationale: AutoPost Hub manages user-owned social content; leakage or mixed account
state is unacceptable.

### II. Scheduling State Integrity
The system MUST preserve a single clear lifecycle for every post: Draft, Scheduled,
Published, or an explicitly documented replacement state. Transitions MUST validate
required fields, timestamps, selected platforms, and ownership before data is written.
Automatic or manual publishing actions MUST be idempotent, update published_at only
when publishing succeeds or is intentionally simulated, and never duplicate or lose
content.

Rationale: Scheduling is the core promise of the product, so status and time data
must stay trustworthy.

### III. Independently Verifiable User Journeys
Every feature MUST be specified as prioritized, independently testable user journeys
with acceptance criteria. Implementation plans MUST identify verification for each
journey, and automated tests are REQUIRED for auth, data isolation, scheduling
transitions, destructive actions, and platform integration behavior. If automated test
infrastructure is missing, the plan MUST include either adding it or a documented
manual verification path with exact steps.

Rationale: The product has stateful workflows; each user journey must be safe to ship
and validate on its own.

### IV. Explicit Platform Integration Boundaries
Instagram, Facebook, TikTok, and future platform integrations MUST have explicit
connected and disconnected states, platform-specific validation, and visible failure
handling. Unsupported capabilities MUST be blocked with clear product feedback rather
than silently ignored. Integration code MUST isolate provider-specific assumptions so
a change for one platform does not alter another platform without deliberate tasks
and tests.

Rationale: Social platforms change independently; users need predictable channel
behavior.

### V. Simple, Observable Operations
Features MUST prefer the existing Next.js App Router, React, Tailwind, Supabase, and
local components before adding new frameworks or services. Errors that affect user
action, scheduling, auth, storage, or publishing MUST be surfaced in the UI and
recorded with enough context for debugging without exposing secrets. New complexity
requires an entry in the plan complexity table with the simpler alternative
considered.

Rationale: A small scheduling product is easier to operate when its dependencies and
failure modes stay visible.

## Product Constraints

- The application is a Next.js 16 App Router web app using React 19, TypeScript,
  Tailwind CSS 4, lucide-react, and Supabase.
- Agent and developer work that changes Next.js behavior MUST consult the relevant
  guide under `node_modules/next/dist/docs/` before writing code.
- Supabase anon keys MAY be used in client code only for public-anon operations
  protected by auth and Row Level Security. Service-role keys and other private
  credentials MUST remain server-side and out of committed files.
- Authenticated routes MUST redirect unauthenticated users to `/auth` or otherwise
  block access before user data is displayed.
- Changes to environment variables, Supabase schema, storage buckets, or Row Level
  Security policies MUST update setup documentation and verification steps in the
  same change.
- UI changes MUST preserve a responsive, accessible dashboard workflow for creating,
  editing, scheduling, publishing, deleting, and reviewing posts.

## Development Workflow

- Specifications MUST define prioritized user stories, edge cases, measurable
  success criteria, and data ownership implications before implementation planning.
- Plans MUST complete the Constitution Check and document the concrete app paths
  affected, especially `app/`, `components/`, `lib/`, Supabase schema or policies,
  and tests.
- Tasks MUST be grouped by independently deliverable user story and include
  verification tasks for each story before cross-cutting polish.
- Changes MUST pass `npm run lint` and `npm run build` unless the plan documents why
  a command cannot run in the current environment.
- Destructive data actions, publishing state changes, and auth changes MUST include
  rollback or recovery notes in the plan or task list.
- Work MUST avoid unrelated rewrites; refactors are acceptable only when they are
  scoped to the feature and covered by verification.

## Governance

This constitution supersedes conflicting local conventions for feature specifications,
plans, tasks, and implementation reviews. Amendments MUST be made by editing this
file, updating affected templates and runtime guidance, and adding a Sync Impact
Report that names the version change and any deferred work.

Versioning follows semantic versioning. MAJOR changes remove or redefine principles or
governance in a backward-incompatible way. MINOR changes add principles, required
sections, or materially expand project rules. PATCH changes clarify wording without
changing obligations.

Every `/speckit-plan`, `/speckit-tasks`, and implementation review MUST check
compliance with the Core Principles. Violations require documented justification in
the plan complexity table and must include the simpler option rejected. Releases or
demos MUST not proceed while mandatory auth, data ownership, scheduling integrity, or
build verification gates are unresolved.

**Version**: 1.0.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-22
