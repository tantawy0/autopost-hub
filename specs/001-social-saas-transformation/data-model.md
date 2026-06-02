# Data Model: Social Publishing SaaS Transformation

## Overview

The feature keeps single-user ownership. Every persisted record that affects
content, media, connected accounts, scheduling, or publishing must be scoped to
one authenticated `user_id`. Supabase RLS policies must enforce this boundary in
addition to application-level checks.

## Entities

### User

Supabase Auth user that owns all records in this release.

**Fields**
- `id` UUID from auth provider
- `email` string

**Relationships**
- One User has many Posts
- One User has many Media Assets
- One User has many Connected Accounts
- One User has many Publishing Attempts through Posts

**Validation**
- No team, workspace, invite, shared-role, or collaborative permission records
  are introduced in this release.

### Post

Unit of social content managed through draft, schedule, and publishing views.

**Fields**
- `id` UUID primary key
- `user_id` UUID, required owner
- `caption` text, optional when media exists
- `first_comment` text, optional
- `status` enum: `Draft`, `Scheduled`, `Published`, `Partially Published`,
  `Failed`
- `platforms` text array or normalized target table containing selected
  destination platforms
- `scheduled_for` timestamptz, required for `Scheduled`
- `published_at` timestamptz, set when all or some destinations publish
- `failure_summary` text, set for Failed or Partially Published outcomes
- `created_at` timestamptz
- `updated_at` timestamptz

**Relationships**
- Many Posts belong to one User
- One Post has zero or more Media Assets
- One Post has zero or more Publishing Attempts
- One Post targets one or more Connected Accounts when scheduled

**Validation**
- Draft may omit `scheduled_for` and platforms.
- Scheduled must have at least one selected live destination and valid future
  `scheduled_for`.
- Published requires every selected live destination to have a successful
  Publishing Attempt.
- Partially Published requires at least one successful and at least one failed
  live destination attempt.
- Failed requires every selected live destination attempt to fail.
- Terminal states Published, Partially Published, and Failed must be idempotent
  for scheduler re-runs.

### Media Asset

Uploaded content attached to a Post and scoped to the owning user.

**Fields**
- `id` UUID primary key
- `user_id` UUID, required owner
- `post_id` UUID nullable until post save, then references Post
- `storage_bucket` text, default `post-images`
- `storage_path` text
- `public_url` text or signed-access reference
- `media_type` enum/string such as `image`, `video`, `carousel`, or provider
  supported type
- `mime_type` text
- `size_bytes` integer
- `provider_metadata` JSONB for publishability metadata
- `created_at` timestamptz

**Relationships**
- Many Media Assets belong to one User
- Many Media Assets may belong to one Post

**Validation**
- `storage_path` must start with the owning user id or equivalent isolated path.
- Media type must be validated against every selected live destination before
  scheduling and publishing.
- Upload failures must not create orphaned publishable post state.

### Connected Account

Social destination linked by a user.

**Fields**
- `id` UUID primary key
- `user_id` UUID, required owner
- `platform` enum: `Facebook`, `Instagram`, `TikTok`
- `account_name` text
- `account_id` text
- `page_id` text nullable
- `instagram_business_account_id` text nullable
- `access_token` encrypted text or secured server-only storage
- `refresh_token` encrypted text nullable
- `token_expires_at` timestamptz nullable
- `status` enum: `Connected`, `Disconnected`, `Expired`, `Revoked`,
  `Unauthorized`, `Placeholder`
- `reconnect_required` boolean
- `created_at` timestamptz
- `updated_at` timestamptz

**Relationships**
- Many Connected Accounts belong to one User
- Connected Accounts can be selected as Post destinations
- Publishing Attempts target one Connected Account

**Validation**
- Only Connected Facebook Pages and Instagram Business accounts can be live
  publishing destinations.
- TikTok records may exist only as non-publishing placeholders until enabled.
- Expired, Revoked, or Unauthorized accounts cannot be selected for scheduling
  or publishing until reconnected.
- User-visible account data is limited to platform and display identity.

### Publishing Attempt

Per-destination processing outcome for a scheduled post.

**Fields**
- `id` UUID primary key
- `user_id` UUID, required owner
- `post_id` UUID references Post
- `connected_account_id` UUID references Connected Account
- `platform` text
- `destination_account_name` text
- `status` enum: `Pending`, `Publishing`, `Succeeded`, `Failed`, `Skipped`
- `provider_post_id` text nullable
- `started_at` timestamptz nullable
- `finished_at` timestamptz nullable
- `error_code` text nullable
- `error_message` text nullable
- `created_at` timestamptz
- `updated_at` timestamptz

**Relationships**
- Many Publishing Attempts belong to one User
- Many Publishing Attempts belong to one Post
- Each Publishing Attempt targets one Connected Account

**Validation**
- Attempts are unique per `post_id` + `connected_account_id` + processing run.
- Re-processing terminal posts must not duplicate successful publications.
- Failure details must be readable to users without exposing secrets or raw
  tokens.

## State Transitions

```text
Draft -> Scheduled
Draft -> Draft
Scheduled -> Published
Scheduled -> Partially Published
Scheduled -> Failed
Scheduled -> Draft (edit/reschedule before due time)
Failed -> Scheduled (after user edits/reconnects and reschedules)
Partially Published -> Partially Published (terminal for already-attempted destinations)
Published -> Published (terminal)
```

## RLS Policy Requirements

- Posts: SELECT, INSERT, UPDATE, DELETE only when `auth.uid() = user_id`.
- Media Assets: SELECT, INSERT, UPDATE, DELETE only when `auth.uid() = user_id`;
  storage paths must be scoped per user.
- Connected Accounts: SELECT, INSERT, UPDATE, DELETE only when
  `auth.uid() = user_id`; provider token columns must not be exposed through
  public UI DTOs.
- Publishing Attempts: SELECT only to owning user; INSERT/UPDATE through
  server-side publishing service with explicit ownership checks.

## Migration Notes

- Preserve existing `posts`, `channels`, and `post-images` data.
- Add `connected_accounts` rather than overloading the prototype `channels`
  table, then migrate or map existing channel records into connected account
  display state.
- Add new status values before writing code that depends on them.
- Rename or map existing `schedule_time` to canonical `scheduled_for` only with
  a migration plan that keeps existing scheduled posts readable.
