# Feature Specification: Social Publishing SaaS Transformation

**Feature Branch**: `001-social-saas-transformation`

**Created**: 2026-05-22

**Status**: Draft

**Input**: User description: "Create all specifications from `autopost-hub-social-saas-spec.md`."

## Clarifications

### Session 2026-05-22

- Q: Which provider publishing scope must the first release support? -> A: Real publishing to eligible connected Facebook Pages and Instagram Business accounts; TikTok remains placeholder.
- Q: Does the first release include multi-user teams or workspaces? -> A: Single-user account ownership only; no teams, workspaces, invites, or shared roles.
- Q: Which publishable content formats must the first release support? -> A: Any provider-supported media type.
- Q: How should multi-destination publishing outcomes be represented? -> A: Use per-destination outcomes; overall status is Published if all succeed, Failed if none succeed, Partially Published if mixed.
- Q: How should expired or revoked connected accounts affect scheduling and publishing? -> A: Block scheduling and publishing until the user reconnects the account.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage a premium scheduling dashboard (Priority: P1)

As an authenticated social media manager, I want a polished dashboard that summarizes
my posts, connected channels, scheduled queue, and recent publishing activity so I can
understand my content pipeline at a glance.

**Why this priority**: The dashboard is the primary entry point and must preserve the
existing product value while raising the experience to a production-grade SaaS level.

**Independent Test**: Sign in with an account that has draft, scheduled, published,
and connected-channel records; verify the dashboard shows accurate counts, queue
items, recent published posts, quick actions, empty states, and responsive layouts.

**Acceptance Scenarios**:

1. **Given** an authenticated user with existing posts and channels, **When** they open
   the dashboard, **Then** they see totals for all posts, drafts, scheduled posts,
   published posts, and connected channels.
2. **Given** an authenticated user with no content yet, **When** they open the
   dashboard, **Then** they see helpful empty states and quick actions instead of blank
   or broken panels.
3. **Given** a user on desktop, tablet, or mobile width, **When** they browse the
   dashboard, **Then** navigation, cards, queues, and actions remain readable,
   reachable, and visually consistent.

---

### User Story 2 - Compose and schedule social posts (Priority: P1)

As an authenticated creator, I want to create a post with caption, first comment,
provider-supported media, selected platforms, and schedule time so I can save a draft
or schedule content without leaving the composer.

**Why this priority**: Post creation is the core workflow of the product and unlocks
drafts, scheduling, calendar, and publishing views.

**Independent Test**: Create a post with media, first comment, selected platforms, and
a future schedule time; verify draft save, scheduled save, validation errors, loading
states, notifications, and return navigation.

**Acceptance Scenarios**:

1. **Given** a signed-in user with at least one connected channel, **When** they enter a
   caption, choose a platform, upload provider-supported media, pick a future schedule
   time, and select Schedule Post, **Then** the post is saved as scheduled and visible
   in the dashboard queue and calendar.
2. **Given** a signed-in user writing content without a schedule time, **When** they
   choose Save Draft, **Then** the post is saved as a draft and can be edited later.
3. **Given** missing required information, **When** the user attempts to schedule a
   post, **Then** the system blocks the submission and explains the exact issue with a
   non-blocking notification.

---

### User Story 3 - Review calendar, drafts, and published content (Priority: P2)

As an authenticated creator, I want calendar, draft, and published-content views backed
by my saved content so I can manage posts across their full lifecycle.

**Why this priority**: Users need reliable post lifecycle views after the composer and
dashboard are usable.

**Independent Test**: Use one account to create draft, scheduled, and published posts;
refresh the app and verify each view shows the expected records, sort order, actions,
media previews, platforms, captions, and empty states.

**Acceptance Scenarios**:

1. **Given** a user has scheduled posts, **When** they open the calendar, **Then** they
   can switch between calendar and list views, filter entries, view platform badges and
   schedule times, and edit a scheduled post.
2. **Given** a user has drafts, **When** they open Drafts, **Then** they can review,
   edit, delete, or schedule each draft.
3. **Given** a user has published posts, **When** they open Published, **Then** posts
   appear newest first with media, platforms, caption, first comment, and edit/delete
   actions where permitted.

---

### User Story 4 - Connect and manage social channels (Priority: P2)

As an authenticated user, I want to connect and disconnect supported social accounts
so I can choose real publishing destinations for my posts.

**Why this priority**: Channel state determines which platforms are available in the
composer and whether publishing can succeed.

**Independent Test**: Connect and disconnect Instagram and Facebook accounts through
the authorization flow, verify connected/disconnected states update, and verify TikTok
appears as a placeholder that cannot be mistaken for a live integration.

**Acceptance Scenarios**:

1. **Given** a user is not connected to a supported platform, **When** they select
   Connect, **Then** they are guided through provider authorization and return to a
   connected state when authorization succeeds.
2. **Given** provider authorization is denied or fails, **When** the user returns to
   the app, **Then** the channel remains disconnected and the failure is explained.
3. **Given** a user disconnects an account, **When** the action completes, **Then** the
   account is no longer selectable for new posts and existing scheduled content makes
   the missing destination clear.

---

### User Story 5 - Publish due content with visible outcomes (Priority: P3)

As a creator, I want scheduled content to be processed automatically and marked as
published, partially published, or failed with clear per-destination outcomes so I
can trust the publishing pipeline.

**Why this priority**: Automated publishing completes the SaaS workflow, but it depends
on reliable content, channel, and scheduling state.

**Independent Test**: Create due scheduled posts for connected and disconnected
Facebook Page and Instagram Business account states; run the scheduled processing flow
and verify successful posts become published, failures become failed with a reason,
mixed outcomes become partially published, and repeated processing does not duplicate
publication.

**Acceptance Scenarios**:

1. **Given** a scheduled post is due and all selected Facebook Page and Instagram
   Business account destinations are available, **When** the publishing process runs,
   **Then** the post is marked published and its publication time is recorded.
2. **Given** a scheduled post is due but a destination fails, **When** the publishing
   process runs and no selected destination succeeds, **Then** the post is marked
   failed and the user can see the failure reason.
3. **Given** a scheduled post targets multiple destinations and only some destinations
   succeed, **When** the publishing process completes, **Then** the post is marked
   partially published and each destination shows its own outcome.
4. **Given** the publishing process runs more than once for the same due post, **When**
   the post has already reached a terminal state, **Then** the system does not create a
   duplicate publication.

---

### Edge Cases

- An unauthenticated visitor attempts to open dashboard, composer, calendar, drafts,
  published, or channels pages.
- A user has no connected channels and attempts to schedule a post.
- A user selects a schedule time in the past or removes the schedule time before
  scheduling.
- Media upload fails, is canceled, or exceeds the allowed product constraints.
- A selected media type is supported by one selected destination but not another.
- A provider authorization callback succeeds but no publishable account is available.
- A connected account expires, is revoked, or lacks permission for the selected action;
  the user must reconnect before scheduling or publishing to that destination.
- A due post has already been manually published before automatic processing runs.
- A multi-destination post succeeds for one selected destination and fails for another.
- A channel is disconnected while scheduled posts still reference it.
- A user attempts to access, edit, delete, publish, or view another user's content.
- Network interruption occurs during save, upload, authorization, disconnect, delete,
  or publishing actions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST provide a premium dashboard with analytics cards for
  total posts, draft posts, scheduled posts, published posts, and connected channels.
- **FR-002**: The dashboard MUST show a scheduled queue, recent published posts,
  connected-channel summary, quick actions, responsive empty states, and polished
  motion or transition feedback.
- **FR-003**: Users MUST be able to create posts with caption, first comment,
  provider-supported media, platform selection, and schedule date/time from a single
  composer.
- **FR-004**: Users MUST be able to save a post as a draft or schedule it for future
  publishing from the composer.
- **FR-005**: The composer MUST validate caption, platform selection, schedule time,
  and media requirements before saving or scheduling a post.
- **FR-006**: All user-facing failures and confirmations MUST use non-blocking
  notifications rather than disruptive browser dialogs.
- **FR-007**: Every async user action MUST show a loading state, disable duplicate
  submission, and communicate when work is in progress.
- **FR-008**: Calendar views MUST use the user's saved scheduled posts as the source
  of truth and provide calendar view, list view, filters, platform badges, schedule
  times, edit actions, responsive layout, and empty states.
- **FR-009**: Drafts MUST come from saved user content and support review, edit,
  deletion, and scheduling later.
- **FR-010**: Published content MUST appear newest first and display media preview,
  platform badges, caption, first comment, and publication time.
- **FR-011**: The channels area MUST show Instagram, Facebook, and TikTok options with
  clear connected and disconnected states.
- **FR-012**: Instagram and Facebook channels MUST support a real account
  authorization flow and live publishing to eligible connected Facebook Pages and
  Instagram Business accounts, while TikTok MUST be presented as a placeholder until
  live publishing is available.
- **FR-013**: The product MUST store connected account details needed to identify the
  platform, account name, account identifiers, authorization status, expiration, and
  ownership.
- **FR-014**: Users MUST be able to disconnect a connected account and receive clear
  feedback about how that affects future posting.
- **FR-015**: Due scheduled posts MUST be discoverable by their scheduled time and
  processed through a publishing flow.
- **FR-016**: Publishing MUST support per-destination success and failure outcomes;
  failures MUST never be silent.
- **FR-017**: Existing sign-in, registration, logout, protected pages, dashboard,
  drafts, scheduled posts, published posts, calendar, channels, media upload, and
  prototype publishing behavior MUST continue to work unless explicitly replaced by
  an equivalent or better workflow.
- **FR-018**: The release MUST include verification notes for manual provider setup,
  account connection, upload, scheduling, publishing, dashboard counts, and
  account-isolation behavior.
- **FR-019**: The first release MUST use single-user account ownership only and MUST
  NOT include teams, workspaces, invites, shared roles, or collaborative permissions.
- **FR-020**: The first release MUST support any publishable media type supported by
  the selected live provider destination and MUST block unsupported destination/media
  combinations before scheduling or publishing.
- **FR-021**: The product MUST block scheduling and publishing to expired, revoked, or
  unauthorized connected accounts until the user reconnects the affected account.

### Data Ownership & Security Requirements

- **DO-001**: Users MUST only be able to access posts, drafts, scheduled posts,
  published posts, media references, connected accounts, and publishing outcomes that
  belong to their authenticated account.
- **DO-002**: Every post, media reference, connected account, and publishing outcome
  MUST have exactly one owning user for this release.
- **DO-003**: Sensitive provider secrets and authorization tokens MUST never be exposed
  through public user interfaces or displayed in user-facing screens.
- **DO-004**: Save, edit, delete, schedule, publish, connect, and disconnect actions
  MUST verify authenticated ownership before changing data.
- **DO-005**: The product MUST preserve existing account isolation controls and MUST
  NOT reset user data, remove isolation protections, hardcode credentials, or delete
  existing features as part of this transformation.
- **DO-006**: User-visible account information MUST be limited to what is needed to
  identify connected destinations, such as platform and account display name.

### Scheduling & Platform Rules

- **SP-001**: Supported post statuses MUST include Draft, Scheduled, Published,
  Partially Published, and Failed, with each post in exactly one overall status at a
  time.
- **SP-002**: Draft posts MAY omit schedule time but MUST remain editable and
  schedulable later.
- **SP-003**: Scheduled posts MUST have at least one selected platform and a valid
  future schedule time at the moment they are scheduled.
- **SP-004**: When scheduled content is successfully published to every selected live
  destination, the post status MUST become Published and a publication time MUST be
  recorded.
- **SP-005**: When publishing fails for every selected live destination, the post
  status MUST become Failed and readable failure reasons MUST be available to the user.
- **SP-006**: When publishing succeeds for at least one selected live destination and
  fails for at least one selected live destination, the post status MUST become
  Partially Published and each destination's outcome MUST be visible to the user.
- **SP-007**: Re-running due-post processing MUST be idempotent for posts that are
  already Published, Partially Published, or Failed.
- **SP-008**: Platform-specific capabilities MUST be clear: eligible connected
  Facebook Pages and Instagram Business accounts are publish-capable targets after
  successful connection, while TikTok remains a placeholder until explicitly enabled.
- **SP-009**: Media validation MUST be destination-aware so a post can only be
  scheduled or published to destinations that support its selected media type.
- **SP-010**: Account validity validation MUST run before scheduling and before
  publishing; expired, revoked, or unauthorized destinations MUST be excluded from
  scheduling and publishing until reconnected.

### Key Entities

- **User**: The authenticated account that owns content, media references, connected
  accounts, schedules, and publishing outcomes.
- **Post**: A unit of social content with caption, optional first comment, media
  reference, selected platforms, overall status, schedule time, publication time, and
  failure summary when applicable.
- **Media Asset**: Uploaded content attached to a post, including media type and any
  provider-relevant publishability metadata, scoped to the owning user.
- **Connected Account**: A social destination linked by a user, including platform,
  account display name, provider account identifiers, authorization status, token
  expiration, reconnect requirement, and ownership.
- **Platform**: A supported or planned publishing destination such as Instagram,
  Facebook, or TikTok.
- **Publishing Attempt**: A per-destination processing outcome for a scheduled post,
  including target platform, destination account, success or failure state,
  publication time, and readable error detail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time test users can create and schedule a post with
  media and a selected platform in under 3 minutes.
- **SC-002**: Dashboard counts and lifecycle lists match the user's saved content after
  refresh in 100% of verification scenarios.
- **SC-003**: Users can find and edit any scheduled or draft post from the relevant
  dashboard, calendar, or draft view in under 30 seconds.
- **SC-004**: Every tested async action provides visible loading feedback and prevents
  duplicate submission.
- **SC-005**: Due posts reach Published, Partially Published, or Failed with visible
  per-destination outcomes within one scheduled-processing run.
- **SC-006**: Account-isolation verification confirms users cannot view or change
  another user's posts, media references, connected accounts, or publishing outcomes.
- **SC-007**: The primary dashboard, composer, calendar, drafts, published, and
  channels workflows are usable on desktop, tablet, and mobile widths without
  overlapping controls or unreadable content.
- **SC-008**: The release verification checklist passes for sign-in, registration,
  logout, protected pages, upload, drafts, scheduling, calendar, published content,
  account connection, dashboard counts, and account isolation.
- **SC-009**: Verification covers provider-supported media publishing and confirms
  unsupported destination/media combinations are blocked before scheduling or
  publishing.
- **SC-010**: Verification confirms expired, revoked, or unauthorized connected
  accounts cannot be selected for scheduling and cannot be published until the user
  reconnects them.

## Assumptions

- The feature is a comprehensive transformation of the existing AutoPost Hub web
  product, not a request to create separate specifications per page.
- Existing sign-in, protected-page behavior, content records, media upload behavior,
  and channel concepts remain in scope and must be preserved.
- Users are individual creators and social media managers managing content for
  Instagram, Facebook, and planned TikTok destinations.
- Teams, workspaces, invitations, shared roles, and collaborative approvals are out of
  scope for the first release.
- TikTok is a placeholder only for this feature and does not require live publishing.
- The first release must publish to eligible connected Facebook Pages and Instagram
  Business accounts rather than simulate publishing for those destinations.
- The first release must support any media type that the selected live destination can
  publish, while blocking combinations that the selected destination does not support.
- Expired, revoked, or unauthorized connected accounts require user reconnection before
  they can be used for scheduling or publishing.
- External provider configuration may still require manual dashboard setup outside the
  product; the product must document any remaining manual steps.
- Mobile native apps are out of scope; the web experience must be responsive across
  common viewport sizes.
