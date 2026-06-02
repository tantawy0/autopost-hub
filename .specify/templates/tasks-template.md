---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories),
research.md, data-model.md, contracts/

**Tests**: Include automated tests when the spec or plan touches auth, data
isolation, scheduling/status transitions, destructive actions, platform
integration, or any explicitly requested behavior. If automated test
infrastructure is not present, include setup tasks or exact manual verification
tasks for each story.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js routes**: `app/<route>/page.tsx`, `app/layout.tsx`, `app/globals.css`
- **Shared UI**: `components/`
- **Shared services**: `lib/`
- **Public assets**: `public/`
- **Tests**: `tests/`, `app/**/__tests__/`, or the test location selected in plan.md
- **Supabase changes**: document schema, storage, RLS, or dashboard changes in the task text

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with priorities P1, P2, P3...)
  - Constitution Check results from plan.md
  - Feature requirements from spec.md and plan.md
  - Entities from data-model.md
  - Endpoints/contracts and Supabase schema or policy changes

  Tasks MUST be organized by user story so each story can be implemented,
  tested, and demonstrated independently.

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project and verification setup required before feature work

- [ ] T001 Confirm affected Next.js routes, components, lib modules, Supabase resources, and docs from plan.md
- [ ] T002 Review relevant `node_modules/next/dist/docs/` guidance if routing, rendering, metadata, or config changes
- [ ] T003 [P] Configure or confirm lint/build/test commands needed for this feature
- [ ] T004 [P] Document required environment variables, Supabase schema, storage buckets, or RLS policy changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T005 Establish authenticated user ownership checks in [exact file/path or Supabase policy]
- [ ] T006 [P] Define or update post/channel data model assumptions in [exact file/doc/path]
- [ ] T007 [P] Implement shared validation for scheduling/status/platform rules in [exact file/path]
- [ ] T008 Configure user-visible error handling and safe diagnostic logging in [exact file/path]
- [ ] T009 Update setup documentation for env vars, Supabase schema, storage, or RLS changes in [exact file/path]

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests/Verification for User Story 1

> Include automated tests for constitution-required areas, or exact manual steps
> when automated infrastructure is intentionally deferred.

- [ ] T010 [P] [US1] Add/define verification for [auth/data/scheduling/platform behavior] in [exact path or manual steps]
- [ ] T011 [P] [US1] Verify failure or edge case behavior for [scenario] in [exact path or manual steps]

### Implementation for User Story 1

- [ ] T012 [P] [US1] Update route/component in app/[route]/page.tsx
- [ ] T013 [P] [US1] Update shared component in components/[component].tsx
- [ ] T014 [US1] Implement Supabase read/write with authenticated ownership in lib/[module].ts or app/[route]/page.tsx
- [ ] T015 [US1] Add validation and visible error handling for [scenario]
- [ ] T016 [US1] Update documentation or quickstart for changed setup/verification

**Checkpoint**: User Story 1 is fully functional and independently verified

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests/Verification for User Story 2

- [ ] T017 [P] [US2] Add/define verification for [behavior] in [exact path or manual steps]
- [ ] T018 [P] [US2] Verify regression coverage for User Story 1 if integration is required

### Implementation for User Story 2

- [ ] T019 [P] [US2] Update route/component in app/[route]/page.tsx
- [ ] T020 [US2] Implement required data/state change in [exact file/path]
- [ ] T021 [US2] Integrate with User Story 1 without breaking independent verification

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests/Verification for User Story 3

- [ ] T022 [P] [US3] Add/define verification for [behavior] in [exact path or manual steps]

### Implementation for User Story 3

- [ ] T023 [P] [US3] Update route/component in app/[route]/page.tsx
- [ ] T024 [US3] Implement required data/state change in [exact file/path]

**Checkpoint**: All selected user stories work independently

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in README.md, specs/[###-feature-name]/quickstart.md, or docs/
- [ ] TXXX Code cleanup and scoped refactoring
- [ ] TXXX Performance or accessibility improvements across affected routes
- [ ] TXXX [P] Additional unit/integration tests for shared behavior
- [ ] TXXX Security hardening for auth, RLS, secrets, storage, or destructive actions
- [ ] TXXX Run `npm run lint`
- [ ] TXXX Run `npm run build`
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel if they touch different files
  - Or sequentially in priority order (P1 -> P2 -> P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational phase - no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational phase - may integrate with US1 while remaining testable
- **User Story 3 (P3)**: Can start after Foundational phase - may integrate with US1/US2 while remaining testable

### Within Each User Story

- Tests or manual verification tasks come before implementation tasks
- Ownership/RLS validation comes before user data reads/writes
- Scheduling/status validation comes before publish or status mutation logic
- Platform-specific validation comes before platform write actions
- Core implementation comes before integration and polish
- Story complete before moving to the next priority

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Foundational tasks marked [P] can run in parallel when they touch different files
- Once Foundational phase completes, user stories can start in parallel if file ownership does not conflict
- Tests/verification for a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different contributors when write sets are disjoint

---

## Parallel Example: User Story 1

```bash
# Launch verification tasks for User Story 1 together:
Task: "Add verification for auth/data ownership in tests/auth/[name].test.ts"
Task: "Add verification for scheduling failure handling in tests/scheduling/[name].test.ts"

# Launch independent implementation tasks:
Task: "Update app/create-post/page.tsx"
Task: "Update components/[component].tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate User Story 1 independently
5. Demo or release if ready

### Incremental Delivery

1. Complete Setup and Foundational phases
2. Add User Story 1, test independently, then demo
3. Add User Story 2, test independently, then demo
4. Add User Story 3, test independently, then demo
5. Confirm each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple contributors:

1. Team completes Setup and Foundational phases together
2. Once Foundational phase is done:
   - Contributor A: User Story 1
   - Contributor B: User Story 2
   - Contributor C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files and no dependencies
- [Story] label maps task to a specific user story for traceability
- Each user story MUST be independently completable and testable
- Verify tests fail before implementation when automated tests are added
- Commit after each task or logical group when the workflow requires it
- Stop at checkpoints to validate stories independently
- Avoid vague tasks, same-file conflicts, and cross-story dependencies that break independence
