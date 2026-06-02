-- Production launch hardening:
-- - close RLS gaps detected by Supabase database advisors
-- - move SECURITY DEFINER helpers out of the exposed public API schema
-- - restrict workspace invitation reads to workspace admins

alter table if exists public.activity_events enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.analytics_daily enable row level security;
alter table if exists public.rate_limit_events enable row level security;

drop policy if exists "activity_events_owner_all" on public.activity_events;
create policy "activity_events_owner_all"
on public.activity_events for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_owner_all" on public.notifications;
create policy "notifications_owner_all"
on public.notifications for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "analytics_daily_owner_all" on public.analytics_daily;
create policy "analytics_daily_owner_all"
on public.analytics_daily for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.rate_limit_events from anon, authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_workspace_role(
  target_workspace_id uuid,
  allowed_roles public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.has_workspace_role(uuid, public.workspace_role[]) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function private.has_workspace_role(uuid, public.workspace_role[]) to authenticated, service_role;

drop policy if exists "workspaces_member_select" on public.workspaces;
create policy "workspaces_member_select"
on public.workspaces for select
to authenticated
using (private.is_workspace_member(id));

drop policy if exists "workspace_members_member_select" on public.workspace_members;
create policy "workspace_members_member_select"
on public.workspace_members for select
to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists "workspace_invitations_admin_select" on public.workspace_invitations;
create policy "workspace_invitations_admin_select"
on public.workspace_invitations for select
to authenticated
using (
  private.has_workspace_role(
    workspace_id,
    array['Owner', 'Admin']::public.workspace_role[]
  )
);

drop policy if exists "brand_profiles_member_select" on public.brand_profiles;
create policy "brand_profiles_member_select"
on public.brand_profiles for select
to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists "brand_memory_member_select" on public.brand_memory_items;
create policy "brand_memory_member_select"
on public.brand_memory_items for select
to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists "automation_flows_member_select" on public.automation_flows;
create policy "automation_flows_member_select"
on public.automation_flows for select
to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists "automation_runs_member_select" on public.automation_runs;
create policy "automation_runs_member_select"
on public.automation_runs for select
to authenticated
using (private.is_workspace_member(workspace_id));

drop policy if exists "audit_logs_member_select" on public.audit_logs;
create policy "audit_logs_member_select"
on public.audit_logs for select
to authenticated
using (workspace_id is null or private.is_workspace_member(workspace_id));

drop function if exists public.is_workspace_member(uuid);
