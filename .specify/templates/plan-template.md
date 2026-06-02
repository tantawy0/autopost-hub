# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See
`.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with concrete technical
  details for this feature. Use NEEDS CLARIFICATION only where the spec does not
  provide enough information.
-->

**Language/Version**: TypeScript 5, React 19, Next.js 16 App Router

**Primary Dependencies**: Next.js, Supabase JS, Tailwind CSS 4, lucide-react

**Storage**: Supabase tables/storage buckets affected, or N/A

**Testing**: `npm run lint`, `npm run build`, plus automated or manual feature
verification defined below

**Target Platform**: Web browser via Next.js

**Project Type**: Single Next.js web application

**Performance Goals**: [domain-specific goals or NEEDS CLARIFICATION]

**Constraints**: [auth, RLS, scheduling, platform, UI, or environment constraints]

**Scale/Scope**: [number of routes, users, posts, channels, or integration scope]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Authenticated User Ownership**: Document the user data touched, ownership
  filters or Supabase Row Level Security assumptions, and how cross-user access
  is prevented and verified.
- **Scheduling State Integrity**: If posts, drafts, schedules, or publish status
  change, define valid lifecycle transitions, timestamp rules, idempotency, and
  recovery behavior.
- **Verifiable User Journeys**: Map each priority story to automated tests or
  exact manual verification steps. Automated tests are required for auth, data
  isolation, scheduling/status transitions, destructive actions, and platform
  integration behavior.
- **Platform Integration Boundaries**: Identify affected social platforms,
  connected/disconnected states, provider-specific validation, unsupported
  capability handling, and isolation from other providers.
- **Simple, Observable Operations**: Confirm the feature uses existing
  Next.js/React/Tailwind/Supabase patterns, surfaces user-impacting errors,
  records debugging context without secrets, and justifies any new dependency or
  service in Complexity Tracking.
- **Next.js 16 Compliance**: If Next.js behavior, routing, rendering, metadata,
  or build config changes, cite the relevant `node_modules/next/dist/docs/`
  guidance consulted.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
  plan.md        # This file (/speckit-plan command output)
  research.md    # Phase 0 output (/speckit-plan command)
  data-model.md  # Phase 1 output (/speckit-plan command)
  quickstart.md  # Phase 1 output (/speckit-plan command)
  contracts/     # Phase 1 output (/speckit-plan command)
  tasks.md       # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace this tree with the exact routes, components, library
  modules, Supabase schema/policy changes, storage buckets, and tests touched by
  this feature. Keep the delivered plan scoped to real paths.
-->

```text
app/
  page.tsx
  auth/page.tsx
  create-post/page.tsx
  edit-post/[id]/page.tsx
  calendar/page.tsx
  drafts/page.tsx
  published/page.tsx
  channels/page.tsx
  layout.tsx
  globals.css
components/
  AuthGuard.tsx
  LoadingButton.tsx
lib/
  supabase.ts
public/
tests/ or app-level test directories as introduced by the plan
```

**Structure Decision**: [Document the selected route(s), component(s), lib
modules, Supabase schema/policies, storage buckets, docs, and tests. Explain why
the change stays scoped to these paths.]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., New background worker] | [current need] | [why existing Next.js/Supabase flow is insufficient] |
| [e.g., New dependency] | [specific problem] | [why existing dependencies are insufficient] |
