create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type public.workspace_role as enum ('Owner', 'Admin', 'Editor', 'Analyst', 'Viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'queue_job_status') then
    create type public.queue_job_status as enum ('queued', 'processing', 'retrying', 'succeeded', 'failed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'automation_run_status') then
    create type public.automation_run_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'connected_account_status') then
    create type public.connected_account_status as enum ('Connected', 'Disconnected', 'Expired', 'Revoked', 'Unauthorized', 'Placeholder');
  end if;

  if not exists (select 1 from pg_type where typname = 'publishing_attempt_status') then
    create type public.publishing_attempt_status as enum ('Pending', 'Publishing', 'Succeeded', 'Failed', 'Skipped');
  end if;
end $$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'Owner',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'Editor',
  token_hash text not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create unique index if not exists workspaces_owner_personal_unique
on public.workspaces (owner_id)
where settings->>'personal' = 'true';

insert into public.workspaces (name, owner_id, settings)
select 'Personal Workspace', user_id, jsonb_build_object('personal', true)
from (
  select user_id from public.posts
  union
  select user_id from public.connected_accounts
  union
  select user_id from public.media_assets
) owners
where user_id is not null
on conflict do nothing;

insert into public.workspace_members (workspace_id, user_id, role)
select id, owner_id, 'Owner'::public.workspace_role
from public.workspaces
on conflict (workspace_id, user_id) do nothing;

-- Ensure tables from earlier migrations exist before alter/backfill (idempotent).
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  storage_bucket text not null default 'post-images',
  storage_path text not null,
  public_url text,
  media_type text not null default 'unknown',
  mime_type text,
  size_bytes integer,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('Facebook', 'Instagram', 'TikTok')),
  account_name text not null,
  account_id text not null,
  page_id text,
  instagram_business_account_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  status public.connected_account_status not null default 'Connected',
  reconnect_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, account_id)
);

create table if not exists public.publishing_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  platform text not null,
  destination_account_name text not null,
  status public.publishing_attempt_status not null default 'Pending',
  provider_post_id text,
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  metric_date date not null,
  impressions integer not null default 0,
  reach integer not null default 0,
  engagement integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, platform, metric_date)
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  platform text not null check (platform in ('Facebook', 'Instagram', 'TikTok')),
  account_name text not null,
  external_post_id text not null,
  caption text,
  media_type text,
  media_url text,
  permalink text,
  timestamp timestamptz,
  like_count integer,
  comments_count integer,
  reactions_count integer,
  engagement_rate numeric,
  views_count integer,
  shares_count integer,
  saves_count integer,
  follows_count integer,
  reach_count integer,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connected_account_id, external_post_id)
);

alter table if exists public.posts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists lifecycle_status text not null default 'draft',
  add column if not exists retry_count integer not null default 0,
  add column if not exists max_retries integer not null default 3,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text;

alter table if exists public.media_assets
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists processing_status text not null default 'uploaded',
  add column if not exists checksum text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists duration_seconds numeric,
  add column if not exists variants jsonb not null default '{}'::jsonb;

alter table if exists public.connected_accounts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists token_ciphertext text,
  add column if not exists refresh_token_ciphertext text,
  add column if not exists token_last_refreshed_at timestamptz,
  add column if not exists token_scopes text[] not null default '{}'::text[],
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb;

alter table if exists public.publishing_attempts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists attempt_number integer not null default 1,
  add column if not exists recoverable boolean not null default true,
  add column if not exists raw_error jsonb not null default '{}'::jsonb;

alter table if exists public.activity_events
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists severity text not null default 'info',
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null;

alter table if exists public.notifications
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists notification_type text not null default 'system',
  add column if not exists grouped_key text;

alter table if exists public.analytics_daily
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

alter table if exists public.social_posts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade,
  add column if not exists synced_at timestamptz not null default now();

do $$
begin
  if to_regclass('public.posts') is not null then
    update public.posts p
    set workspace_id = w.id
    from public.workspaces w
    where p.workspace_id is null and w.owner_id = p.user_id;
  end if;

  if to_regclass('public.media_assets') is not null then
    update public.media_assets m
    set workspace_id = w.id
    from public.workspaces w
    where m.workspace_id is null and w.owner_id = m.user_id;
  end if;

  if to_regclass('public.connected_accounts') is not null then
    update public.connected_accounts c
    set workspace_id = w.id
    from public.workspaces w
    where c.workspace_id is null and w.owner_id = c.user_id;
  end if;

  if to_regclass('public.publishing_attempts') is not null then
    update public.publishing_attempts a
    set workspace_id = w.id
    from public.workspaces w
    where a.workspace_id is null and w.owner_id = a.user_id;
  end if;

  if to_regclass('public.activity_events') is not null then
    update public.activity_events e
    set workspace_id = w.id
    from public.workspaces w
    where e.workspace_id is null and w.owner_id = e.user_id;
  end if;

  if to_regclass('public.notifications') is not null then
    update public.notifications n
    set workspace_id = w.id
    from public.workspaces w
    where n.workspace_id is null and w.owner_id = n.user_id;
  end if;

  if to_regclass('public.analytics_daily') is not null then
    update public.analytics_daily d
    set workspace_id = w.id
    from public.workspaces w
    where d.workspace_id is null and w.owner_id = d.user_id;
  end if;

  if to_regclass('public.social_posts') is not null then
    update public.social_posts s
    set workspace_id = w.id
    from public.workspaces w
    where s.workspace_id is null and w.owner_id = s.user_id;
  end if;
end $$;

create table if not exists public.post_destinations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  connected_account_id uuid not null references public.connected_accounts(id) on delete cascade,
  platform text not null check (platform in ('Facebook', 'Instagram', 'TikTok')),
  status text not null default 'selected',
  created_at timestamptz not null default now(),
  unique (post_id, connected_account_id)
);

create table if not exists public.post_queue_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  status public.queue_job_status not null default 'queued',
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  last_error_code text,
  last_error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists post_queue_jobs_active_unique
on public.post_queue_jobs (post_id)
where status in ('queued', 'processing', 'retrying');

create table if not exists public.draft_autosaves (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  client_draft_id text,
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_draft_id)
);

create table if not exists public.social_post_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  social_post_id uuid references public.social_posts(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete cascade,
  platform text not null,
  metric_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.analytics_rollups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  grain text not null check (grain in ('day', 'week', 'month')),
  period_start date not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform, grain, period_start)
);

create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  voice jsonb not null default '{}'::jsonb,
  audience jsonb not null default '{}'::jsonb,
  rules jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_memory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  memory_type text not null,
  content text not null,
  embedding jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  generation_type text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  model text,
  provider text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_scores (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  caption text,
  platform text,
  viral_score integer not null default 0 check (viral_score between 0 and 100),
  clarity_score integer not null default 0 check (clarity_score between 0 and 100),
  hook_score integer not null default 0 check (hook_score between 0 and 100),
  recommendations jsonb not null default '[]'::jsonb,
  scoring_version text not null default 'heuristic-v1',
  created_at timestamptz not null default now()
);

create table if not exists public.engagement_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete cascade,
  social_post_id uuid references public.social_posts(id) on delete set null,
  platform text not null,
  external_thread_id text not null,
  author_name text,
  author_external_id text,
  status text not null default 'open',
  sentiment text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connected_account_id, external_thread_id)
);

create table if not exists public.engagement_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.engagement_threads(id) on delete cascade,
  external_message_id text,
  direction text not null default 'inbound',
  body text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (thread_id, external_message_id)
);

create table if not exists public.automation_flows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  status text not null default 'paused',
  definition jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  flow_id uuid references public.automation_flows(id) on delete set null,
  status public.automation_run_status not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  action text not null,
  occurred_at timestamptz not null default now()
);

create index if not exists workspaces_owner_idx on public.workspaces (owner_id);
create index if not exists workspace_members_user_idx on public.workspace_members (user_id, workspace_id);
create index if not exists posts_workspace_status_due_idx on public.posts (workspace_id, status, scheduled_for);
create index if not exists posts_due_idx on public.posts (status, scheduled_for) where status = 'Scheduled';
create index if not exists connected_accounts_workspace_platform_idx on public.connected_accounts (workspace_id, platform, status);
create index if not exists media_assets_workspace_post_idx on public.media_assets (workspace_id, post_id, created_at);
create index if not exists publishing_attempts_post_idx on public.publishing_attempts (post_id, created_at desc);
create index if not exists post_queue_jobs_status_run_after_idx on public.post_queue_jobs (status, run_after, locked_at);
create index if not exists draft_autosaves_user_updated_idx on public.draft_autosaves (user_id, updated_at desc);

do $$
begin
  if to_regclass('public.social_posts') is not null then
    execute 'create index if not exists social_posts_workspace_timestamp_idx on public.social_posts (workspace_id, timestamp desc)';
  end if;

  if to_regclass('public.social_post_metric_snapshots') is not null then
    execute 'create index if not exists social_metric_snapshots_post_idx on public.social_post_metric_snapshots (social_post_id, metric_at desc)';
  end if;
end $$;
create index if not exists analytics_rollups_workspace_period_idx on public.analytics_rollups (workspace_id, grain, period_start desc);
create index if not exists brand_memory_workspace_type_idx on public.brand_memory_items (workspace_id, memory_type, created_at desc);
create index if not exists content_scores_workspace_created_idx on public.content_scores (workspace_id, created_at desc);
create index if not exists engagement_threads_workspace_status_idx on public.engagement_threads (workspace_id, status, last_message_at desc);
create index if not exists automation_runs_workspace_status_idx on public.automation_runs (workspace_id, status, created_at desc);
create index if not exists audit_logs_workspace_created_idx on public.audit_logs (workspace_id, created_at desc);
create index if not exists rate_limit_events_key_action_time_idx on public.rate_limit_events (key, action, occurred_at desc);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.post_destinations enable row level security;
alter table public.post_queue_jobs enable row level security;
alter table public.draft_autosaves enable row level security;
alter table public.social_post_metric_snapshots enable row level security;
alter table public.analytics_rollups enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.brand_memory_items enable row level security;
alter table public.ai_generations enable row level security;
alter table public.content_scores enable row level security;
alter table public.engagement_threads enable row level security;
alter table public.engagement_messages enable row level security;
alter table public.automation_flows enable row level security;
alter table public.automation_runs enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "workspaces_member_select" on public.workspaces;
create policy "workspaces_member_select" on public.workspaces for select using (public.is_workspace_member(id));

drop policy if exists "workspace_members_member_select" on public.workspace_members;
create policy "workspace_members_member_select" on public.workspace_members for select using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_invitations_admin_select" on public.workspace_invitations;
create policy "workspace_invitations_admin_select" on public.workspace_invitations for select using (public.is_workspace_member(workspace_id));

drop policy if exists "post_destinations_owner_all" on public.post_destinations;
create policy "post_destinations_owner_all" on public.post_destinations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "post_queue_jobs_owner_select" on public.post_queue_jobs;
create policy "post_queue_jobs_owner_select" on public.post_queue_jobs for select using (auth.uid() = user_id);

drop policy if exists "draft_autosaves_owner_all" on public.draft_autosaves;
create policy "draft_autosaves_owner_all" on public.draft_autosaves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "social_metric_snapshots_owner_all" on public.social_post_metric_snapshots;
create policy "social_metric_snapshots_owner_all" on public.social_post_metric_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "analytics_rollups_owner_all" on public.analytics_rollups;
create policy "analytics_rollups_owner_all" on public.analytics_rollups for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "brand_profiles_member_select" on public.brand_profiles;
create policy "brand_profiles_member_select" on public.brand_profiles for select using (public.is_workspace_member(workspace_id));

drop policy if exists "brand_memory_member_select" on public.brand_memory_items;
create policy "brand_memory_member_select" on public.brand_memory_items for select using (public.is_workspace_member(workspace_id));

drop policy if exists "ai_generations_owner_all" on public.ai_generations;
create policy "ai_generations_owner_all" on public.ai_generations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "content_scores_owner_all" on public.content_scores;
create policy "content_scores_owner_all" on public.content_scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "engagement_threads_owner_all" on public.engagement_threads;
create policy "engagement_threads_owner_all" on public.engagement_threads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "engagement_messages_owner_all" on public.engagement_messages;
create policy "engagement_messages_owner_all" on public.engagement_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "automation_flows_member_select" on public.automation_flows;
create policy "automation_flows_member_select" on public.automation_flows for select using (public.is_workspace_member(workspace_id));

drop policy if exists "automation_runs_member_select" on public.automation_runs;
create policy "automation_runs_member_select" on public.automation_runs for select using (public.is_workspace_member(workspace_id));

drop policy if exists "audit_logs_member_select" on public.audit_logs;
create policy "audit_logs_member_select" on public.audit_logs for select using (workspace_id is null or public.is_workspace_member(workspace_id));
