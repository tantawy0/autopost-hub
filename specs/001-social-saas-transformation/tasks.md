# Tasks: Social Publishing SaaS Transformation

**Input**: Design documents from `/specs/001-social-saas-transformation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/api-contract.md`, `quickstart.md`

**Tests**: Automated Playwright E2E tests are required by the feature specification, plan, and constitution because this work touches auth, data isolation, scheduling/status transitions, destructive actions, and live platform integration boundaries.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. Setup and foundational tasks must complete before story work starts.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on incomplete tasks
- **[Story]**: User story label for story phases only
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare dependencies, verification tooling, docs, and schema entry points required by all stories.

- [X] T001 Record reviewed Next.js 16 route handler, server/client, data security, environment variable, and Playwright guidance from `node_modules/next/dist/docs/` in `specs/001-social-saas-transformation/quickstart.md`
- [X] T002 Add `framer-motion`, `sonner`, `@playwright/test`, and a `test:e2e` script in `package.json` and `package-lock.json`
- [X] T003 Create Playwright configuration for the Next.js app in `playwright.config.ts`
- [X] T004 [P] Create authenticated-session helpers for E2E tests in `tests/e2e/helpers/auth.ts`
- [X] T005 [P] Create seeded post/channel fixture helpers for E2E tests in `tests/e2e/helpers/fixtures.ts`
- [X] T006 [P] Create manual Meta provider setup documentation in `docs/meta-provider-setup.md`
- [X] T007 Create Supabase schema, storage, and RLS migration for posts, media assets, connected accounts, and publishing attempts in `supabase/migrations/202605220001_social_saas_schema.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared domain, auth, validation, provider, UI, and test foundation required before any user story implementation.

**CRITICAL**: No user story work should begin until this phase is complete.

- [X] T008 Define platform, post status, connected account, media asset, and publishing attempt types in `lib/types.ts`
- [X] T009 Implement a server-only Supabase client for privileged workflows in `lib/supabase-server.ts`
- [X] T010 Implement authenticated user lookup and ownership assertion helpers in `lib/auth.ts`
- [X] T011 Update protected-route handling and non-blocking auth feedback in `components/AuthGuard.tsx`
- [X] T012 [P] Implement destination-aware media validation primitives in `lib/validation/media.ts`
- [X] T013 [P] Implement scheduling, status transition, and account-validity validation in `lib/validation/scheduling.ts`
- [X] T014 Implement shared post data-access functions and safe DTO mapping in `lib/posts.ts`
- [X] T015 Implement shared connected-account data-access functions and safe DTO mapping in `lib/channels.ts`
- [X] T016 Implement publishing service skeleton, status aggregation types, and idempotency guards in `lib/publishing.ts`
- [X] T017 [P] Implement Meta OAuth URL, state, token exchange, and safe error helpers in `lib/providers/meta.ts`
- [X] T018 [P] Implement Facebook Page capability and publish adapter scaffolding in `lib/providers/facebook.ts`
- [X] T019 [P] Implement Instagram Business account capability and publish adapter scaffolding in `lib/providers/instagram.ts`
- [X] T020 [P] Implement TikTok placeholder capability rules in `lib/providers/tiktok.ts`
- [X] T021 Add semantic dark SaaS tokens, responsive focus states, and reduced-motion rules in `app/globals.css`
- [X] T022 Create a shared toast provider wrapper for Sonner in `components/ui/ToastProvider.tsx`
- [X] T023 Wire the shared toast provider into the root layout in `app/layout.tsx`
- [X] T024 Create the authenticated application shell wrapper in `components/app-shell/AppShell.tsx`
- [X] T025 [P] Create desktop navigation for the app shell in `components/app-shell/Sidebar.tsx`
- [X] T026 [P] Create mobile navigation for the app shell in `components/app-shell/MobileNav.tsx`
- [X] T027 [P] Create reusable empty-state UI in `components/ui/EmptyState.tsx`
- [X] T028 [P] Create reusable status pill UI in `components/ui/StatusPill.tsx`
- [X] T029 Add protected-route login, register, logout, and redirect E2E coverage in `tests/e2e/auth.spec.ts`

**Checkpoint**: Foundation ready - all stories can now start from typed domain services, safe auth helpers, shared UI, and automated browser test infrastructure.

---

## Phase 3: User Story 1 - Manage a Premium Scheduling Dashboard (Priority: P1) MVP

**Goal**: Authenticated users can open a polished dashboard that summarizes post counts, connected channels, scheduled queue, recent publishing activity, quick actions, empty states, and responsive layouts.

**Independent Test**: Sign in with seeded draft, scheduled, published, failed, partially published, and connected-account records; verify counts, lists, empty states, quick actions, ownership isolation, and responsive dashboard layouts.

### Tests/Verification for User Story 1

- [X] T030 [P] [US1] Add dashboard counts, queue, recent published, empty state, and responsive viewport coverage in `tests/e2e/dashboard.spec.ts`
- [X] T031 [P] [US1] Add dashboard ownership isolation coverage for another user's posts and connected accounts in `tests/e2e/dashboard-isolation.spec.ts`

### Implementation for User Story 1

- [X] T032 [P] [US1] Create metric card UI for dashboard analytics in `components/dashboard/MetricCard.tsx`
- [X] T033 [P] [US1] Create dashboard counts composition component in `components/dashboard/DashboardCounts.tsx`
- [X] T034 [P] [US1] Create scheduled queue component with empty and loading states in `components/dashboard/ScheduledQueue.tsx`
- [X] T035 [P] [US1] Create recent published component with failed and partially published status support in `components/dashboard/RecentPublished.tsx`
- [X] T036 [P] [US1] Create connected-channel summary component in `components/dashboard/ConnectedChannelsSummary.tsx`
- [X] T037 [P] [US1] Create dashboard quick-action component in `components/dashboard/QuickActions.tsx`
- [X] T038 [US1] Implement dashboard summary read model and count aggregation in `lib/posts.ts`
- [X] T039 [US1] Rebuild the authenticated dashboard route with app shell, metrics, queues, summaries, and responsive layout in `app/page.tsx`
- [X] T040 [US1] Replace dashboard browser dialogs or silent failures with loading states and Sonner notifications in `app/page.tsx`
- [X] T041 [US1] Document dashboard verification coverage and remaining manual checks in `specs/001-social-saas-transformation/quickstart.md`

**Checkpoint**: User Story 1 is fully functional and independently verifiable as the MVP dashboard slice.

---

## Phase 4: User Story 2 - Compose and Schedule Social Posts (Priority: P1)

**Goal**: Authenticated users can create posts with caption, first comment, provider-supported media, selected destinations, and draft or scheduled state from one composer.

**Independent Test**: Create a draft and a scheduled post with media and selected destinations; verify validation errors, duplicate-submit prevention, upload behavior, notifications, return navigation, dashboard queue visibility, and calendar visibility after refresh.

### Tests/Verification for User Story 2

- [X] T042 [P] [US2] Add composer draft save, scheduled save, validation, loading, and navigation coverage in `tests/e2e/composer.spec.ts`
- [X] T043 [P] [US2] Add destination-aware upload and unsupported media combination coverage in `tests/e2e/media-validation.spec.ts`

### Implementation for User Story 2

- [X] T044 [P] [US2] Create provider-aware media upload UI in `components/posts/MediaUploader.tsx`
- [X] T045 [P] [US2] Create connected-destination selector UI in `components/posts/PlatformSelector.tsx`
- [X] T046 [P] [US2] Create future-only schedule picker UI in `components/posts/SchedulePicker.tsx`
- [X] T047 [P] [US2] Create first-comment editor UI in `components/posts/FirstCommentField.tsx`
- [X] T048 [US2] Create the composed post form with draft and schedule actions in `components/posts/PostComposerForm.tsx`
- [X] T049 [US2] Implement create, update, draft-save, and schedule-save mutations with ownership checks in `lib/posts.ts`
- [X] T050 [US2] Wire Supabase Storage upload, cancellation, and failure cleanup in `components/posts/MediaUploader.tsx`
- [X] T051 [US2] Replace the create-post route with the shared composer workflow in `app/create-post/page.tsx`
- [X] T052 [US2] Replace the edit-post route with the shared composer workflow and existing post loading in `app/edit-post/[id]/page.tsx`
- [X] T053 [US2] Add validation messages, duplicate-submit prevention, and Sonner feedback to `components/posts/PostComposerForm.tsx`
- [X] T054 [US2] Ensure scheduled posts and drafts saved from the composer are visible through dashboard queries in `lib/posts.ts`

**Checkpoint**: User Story 2 is fully functional and independently verifiable as the core creation and scheduling workflow.

---

## Phase 5: User Story 3 - Review Calendar, Drafts, and Published Content (Priority: P2)

**Goal**: Authenticated users can manage saved content across calendar, drafts, and published views using persisted post lifecycle state.

**Independent Test**: Create draft, scheduled, published, failed, and partially published posts; refresh the app and verify each lifecycle view shows the right records, sort order, filters, media previews, platform badges, actions, and empty states.

### Tests/Verification for User Story 3

- [X] T055 [P] [US3] Add calendar, drafts, published list, sorting, filters, and empty-state coverage in `tests/e2e/content-lifecycle.spec.ts`
- [X] T056 [P] [US3] Add edit, delete, schedule-later, and destructive-action coverage in `tests/e2e/post-actions.spec.ts`

### Implementation for User Story 3

- [X] T057 [P] [US3] Create reusable post card UI with media preview and platform badges in `components/posts/PostCard.tsx`
- [X] T058 [P] [US3] Create reusable post status badge UI in `components/posts/PostStatusBadge.tsx`
- [X] T059 [P] [US3] Create reusable post filter controls in `components/posts/PostFilters.tsx`
- [X] T060 [P] [US3] Create calendar/list view UI for scheduled posts in `components/posts/CalendarView.tsx`
- [X] T061 [P] [US3] Create reusable confirmation dialog for destructive post actions in `components/ui/ConfirmDialog.tsx`
- [X] T062 [US3] Implement lifecycle list queries, filters, delete, and schedule-later mutations in `lib/posts.ts`
- [X] T063 [US3] Rebuild the calendar route around saved scheduled posts and responsive calendar/list views in `app/calendar/page.tsx`
- [X] T064 [US3] Rebuild the drafts route around saved drafts, edit links, delete, and schedule-later actions in `app/drafts/page.tsx`
- [X] T065 [US3] Rebuild the published route around newest-first saved published content in `app/published/page.tsx`
- [X] T066 [US3] Replace lifecycle view browser dialogs with confirmation dialog and Sonner feedback in `app/drafts/page.tsx`

**Checkpoint**: User Story 3 is fully functional and independently verifiable for post lifecycle management.

---

## Phase 6: User Story 4 - Connect and Manage Social Channels (Priority: P2)

**Goal**: Authenticated users can connect and disconnect Facebook and Instagram destinations through Meta authorization while TikTok remains a clearly labeled placeholder.

**Independent Test**: Run the Meta login/callback flow for Facebook Pages and Instagram Business accounts, verify connected/disconnected/reconnect-required states, disconnect an account, and confirm TikTok cannot be mistaken for a live publishing destination.

### Tests/Verification for User Story 4

- [X] T067 [P] [US4] Add channels page connect, disconnect, placeholder, reconnect-required, and feedback coverage in `tests/e2e/channels.spec.ts`
- [X] T068 [P] [US4] Add Meta login and callback success, denied, no eligible account, and safe-error coverage in `tests/e2e/meta-oauth.spec.ts`

### Implementation for User Story 4

- [X] T069 [P] [US4] Create channel card UI with connected, disconnected, expired, revoked, unauthorized, and placeholder states in `components/channels/ChannelCard.tsx`
- [X] T070 [P] [US4] Create connected-account list UI in `components/channels/ConnectedAccountList.tsx`
- [X] T071 [P] [US4] Create reconnect-required warning UI in `components/channels/ReconnectRequiredBanner.tsx`
- [X] T072 [US4] Implement connected-account queries, disconnect mutation, and selectable destination filtering in `lib/channels.ts`
- [X] T073 [US4] Implement authenticated Meta authorization redirect and state persistence in `app/api/meta/login/route.ts`
- [X] T074 [US4] Implement Meta callback exchange, eligible destination persistence, and safe redirects in `app/api/meta/callback/route.ts`
- [X] T075 [US4] Implement authenticated connected-account disconnect endpoint in `app/api/channels/[connectedAccountId]/disconnect/route.ts`
- [X] T076 [US4] Rebuild the channels route with live Facebook, live Instagram, TikTok placeholder, reconnect state, and disconnect actions in `app/channels/page.tsx`
- [X] T077 [US4] Document provider dashboard setup, permissions, redirect URI, and tester requirements in `docs/meta-provider-setup.md`
- [X] T078 [US4] Add provider setup and channel verification links to `specs/001-social-saas-transformation/quickstart.md`

**Checkpoint**: User Story 4 is fully functional and independently verifiable for channel authorization and management.

---

## Phase 7: User Story 5 - Publish Due Content With Visible Outcomes (Priority: P3)

**Goal**: Due scheduled content is processed server-side, published to eligible Facebook and Instagram destinations, and marked Published, Partially Published, or Failed with per-destination outcomes.

**Independent Test**: Create due scheduled posts targeting connected, expired, revoked, unauthorized, and disconnected destinations; run the scheduler and publish-now flows; verify outcome aggregation, visible failure reasons, and idempotency on repeated processing.

### Tests/Verification for User Story 5

- [X] T079 [P] [US5] Add publish-now and scheduler Published, Partially Published, Failed, and visible outcome coverage in `tests/e2e/publishing.spec.ts`
- [X] T080 [P] [US5] Add scheduler authorization, dry-run, limit, terminal-state skip, and idempotency coverage in `tests/e2e/scheduler.spec.ts`
- [X] T081 [P] [US5] Add cross-account publishing and attempt isolation coverage in `tests/e2e/publishing-isolation.spec.ts`

### Implementation for User Story 5

- [X] T082 [US5] Implement Facebook Page live publish, validate-only, and safe provider error mapping in `lib/providers/facebook.ts`
- [X] T083 [US5] Implement Instagram Business live publish, validate-only, and safe provider error mapping in `lib/providers/instagram.ts`
- [X] T084 [US5] Implement publishing orchestration, per-destination attempts, aggregate post status, and terminal-state idempotency in `lib/publishing.ts`
- [X] T085 [US5] Implement authorized due-post scheduler route with dry-run, limit, and safe response counters in `app/api/scheduler/process-due-posts/route.ts`
- [X] T086 [US5] Implement authenticated publish-now route with ownership, validation, and terminal-state conflict handling in `app/api/posts/[postId]/publish-now/route.ts`
- [X] T087 [P] [US5] Create per-destination publishing attempt UI in `components/posts/PublishingAttemptList.tsx`
- [X] T088 [US5] Display publishing attempts, failure summaries, and partial outcomes on published content in `app/published/page.tsx`
- [X] T089 [US5] Display disconnected, expired, revoked, and unauthorized destination warnings for scheduled content in `app/calendar/page.tsx`
- [X] T090 [US5] Display failed and partially published destination summaries in dashboard queue and recent published panels in `components/dashboard/ScheduledQueue.tsx`
- [X] T091 [US5] Document scheduler secret, manual scheduler smoke test, and publishing outcome verification in `specs/001-social-saas-transformation/quickstart.md`

**Checkpoint**: User Story 5 is fully functional and independently verifiable for publishing outcomes and idempotent due-post processing.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final quality, security, documentation, and verification across all user stories.

- [X] T092 [P] Update project feature, environment, migration, and verification documentation in `README.md`
- [X] T093 [P] Create Supabase RLS and storage policy verification checklist in `docs/supabase-rls-checklist.md`
- [X] T094 Update sign-in, registration, logout, loading, and non-blocking auth feedback in `app/auth/page.tsx`
- [X] T095 Run `npm run lint` and record the final result in `specs/001-social-saas-transformation/quickstart.md`
- [X] T096 Run `npm run build` and record the final result in `specs/001-social-saas-transformation/quickstart.md`
- [X] T097 Run `npm run test:e2e` and record the final result in `specs/001-social-saas-transformation/quickstart.md`
- [X] T098 Audit responsive layout, focus states, color contrast, and reduced-motion behavior across `app/globals.css`
- [X] T099 Audit server-only secret usage and safe provider error output across `lib/providers/meta.ts`
- [X] T100 Update final release verification checklist in `specs/001-social-saas-transformation/checklists/requirements.md`
- [X] T101 Record final manual verification evidence for auth, scheduling, channels, publishing, and account isolation in `specs/001-social-saas-transformation/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all story work.
- **User Stories (Phase 3+)**: Depend on Foundational completion. Stories can proceed in priority order or in parallel when write sets are disjoint.
- **Polish (Phase 8)**: Depends on all selected user stories being complete.

### User Story Dependencies

- **US1 (P1) Dashboard**: Starts after Foundational and has no dependency on other stories.
- **US2 (P1) Composer/Scheduling**: Starts after Foundational and can be verified independently through composer, dashboard queue, and calendar visibility.
- **US3 (P2) Lifecycle Views**: Starts after Foundational; benefits from US2-created data but can be verified with seeded fixtures.
- **US4 (P2) Channels/Meta**: Starts after Foundational; feeds selectable destinations for US2 and US5 but can be verified independently with mocked or live Meta callback flows.
- **US5 (P3) Publishing Outcomes**: Starts after Foundational; depends conceptually on posts and connected accounts but can be verified independently with seeded due posts and accounts.

### Within Each User Story

- Add or define tests before implementation.
- Implement validation and ownership checks before write actions.
- Implement data services before route/page integration.
- Implement UI components before route composition.
- Complete story-specific verification before moving to another priority for release.

---

## Parallel Opportunities

- **Setup**: T004, T005, and T006 can run in parallel after T002/T003 are understood.
- **Foundational**: T012, T013, T017, T018, T019, T020, T025, T026, T027, and T028 can run in parallel because they touch separate files.
- **US1**: T030 and T031 can run in parallel; T032 through T037 can run in parallel before T039 integrates the dashboard.
- **US2**: T042 and T043 can run in parallel; T044 through T047 can run in parallel before T048 integrates the composer form.
- **US3**: T055 and T056 can run in parallel; T057 through T061 can run in parallel before route integration in T063 through T066.
- **US4**: T067 and T068 can run in parallel; T069 through T071 can run in parallel before T076 integrates the channels page.
- **US5**: T079 through T081 can run in parallel; T087 can run in parallel with provider work T082 and T083.

---

## Parallel Example: User Story 1

```bash
# Verification tasks
Task: "T030 Add dashboard counts, queue, recent published, empty state, and responsive viewport coverage in tests/e2e/dashboard.spec.ts"
Task: "T031 Add dashboard ownership isolation coverage for another user's posts and connected accounts in tests/e2e/dashboard-isolation.spec.ts"

# Independent component tasks
Task: "T032 Create metric card UI for dashboard analytics in components/dashboard/MetricCard.tsx"
Task: "T034 Create scheduled queue component with empty and loading states in components/dashboard/ScheduledQueue.tsx"
Task: "T036 Create connected-channel summary component in components/dashboard/ConnectedChannelsSummary.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T044 Create provider-aware media upload UI in components/posts/MediaUploader.tsx"
Task: "T045 Create connected-destination selector UI in components/posts/PlatformSelector.tsx"
Task: "T046 Create future-only schedule picker UI in components/posts/SchedulePicker.tsx"
Task: "T047 Create first-comment editor UI in components/posts/FirstCommentField.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "T069 Create channel card UI with connected, disconnected, expired, revoked, unauthorized, and placeholder states in components/channels/ChannelCard.tsx"
Task: "T070 Create connected-account list UI in components/channels/ConnectedAccountList.tsx"
Task: "T071 Create reconnect-required warning UI in components/channels/ReconnectRequiredBanner.tsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate dashboard counts, empty states, ownership isolation, and responsive layouts independently.

### Core Product Slice

1. Complete MVP First.
2. Complete Phase 4: User Story 2.
3. Validate draft save, schedule save, media validation, and dashboard/calendar visibility.
4. This is the smallest useful product slice for real creators.

### Incremental Delivery

1. Add User Story 3 for lifecycle management.
2. Add User Story 4 for live channel connection.
3. Add User Story 5 for automated publishing outcomes.
4. Run Phase 8 checks after each release candidate.

### Parallel Team Strategy

1. Complete Setup and Foundational phases together.
2. Assign US1 dashboard, US2 composer, US3 lifecycle views, US4 channels, and US5 publishing to separate contributors only after shared types and services are stable.
3. Avoid same-file conflicts in `lib/posts.ts`, `lib/channels.ts`, `lib/publishing.ts`, and existing route files by merging service contracts before parallel UI work.

---

## Notes

- Tasks marked [P] are independent by file path and should not depend on incomplete work.
- User story tasks include `[US1]` through `[US5]` labels for traceability.
- Setup, foundational, and polish tasks intentionally have no user story label.
- Verify tests fail before implementation when adding automated tests.
- Keep provider tokens and service role keys server-side only.
- Preserve existing user data and RLS protections while migrating prototype tables.
