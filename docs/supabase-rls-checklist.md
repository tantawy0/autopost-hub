# Supabase RLS Checklist

Last audited: 2026-05-26

- [x] `posts` has RLS enabled.
- [x] `posts` policies scope SELECT, INSERT, UPDATE, and DELETE to `auth.uid() = user_id`.
- [x] `media_assets` has RLS enabled.
- [x] `media_assets` policies scope SELECT, INSERT, UPDATE, and DELETE to `auth.uid() = user_id`.
- [x] `connected_accounts` has RLS enabled.
- [x] `connected_accounts` policies scope user reads and writes to `auth.uid() = user_id`.
- [x] `publishing_attempts` has RLS enabled.
- [x] `publishing_attempts` SELECT/INSERT/UPDATE are scoped to `auth.uid() = user_id`.
- [x] `draft_autosaves` has RLS enabled and owner-scoped all policy.
- [x] `post_destinations` has RLS enabled and owner-scoped all policy.
- [x] `background_jobs` has RLS enabled and owner-scoped select policy; writes are server/worker only.
- [x] Analytics tables have RLS enabled with owner/workspace policies.
- [x] AI generation/usage tables have RLS enabled with owner policies.
- [x] Workspace tables have member-scoped select policies.
- [x] Audit logs have member-scoped select policy.
- [x] Service-role usage is limited to server route handlers and background publishing workflows.
- [x] Service-role route handlers enforce `user_id` ownership and workspace RBAC because RLS is bypassed.
- [x] Denied sensitive actions write `authz.denied` rows to `audit_logs`.
- [ ] Supabase Storage bucket `post-images` exists in production.
- [ ] Supabase Storage policies scope object paths to the owning user id prefix.

Storage bucket requirements are documented in `docs/STORAGE_BUCKETS.md`.
