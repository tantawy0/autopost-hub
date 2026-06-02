-- Analytics ingestion hardening: idempotency, hourly rollups, growth snapshots, ingestion receipts

alter table if exists public.analytics_rollups
  drop constraint if exists analytics_rollups_grain_check;

alter table if exists public.analytics_rollups
  add constraint analytics_rollups_grain_check
  check (grain in ('hour', 'day', 'week', 'month'));

alter table if exists public.analytics_rollups
  add column if not exists bucket_key text;

update public.analytics_rollups
set bucket_key = period_start::text
where bucket_key is null;

alter table if exists public.social_post_metric_snapshots
  add column if not exists idempotency_key text,
  add column if not exists source text not null default 'sync',
  add column if not exists lifecycle_status text not null default 'active',
  add column if not exists superseded_at timestamptz;

create unique index if not exists social_post_metric_snapshots_idempotency_unique
on public.social_post_metric_snapshots (idempotency_key)
where idempotency_key is not null;

create index if not exists social_post_metric_snapshots_lifecycle_idx
on public.social_post_metric_snapshots (social_post_id, lifecycle_status, metric_at desc);

create table if not exists public.analytics_ingestion_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ingestion_kind text not null check (ingestion_kind in ('daily_platform', 'post_snapshot', 'growth_snapshot', 'hourly_rollup')),
  idempotency_key text not null,
  payload_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists analytics_ingestion_receipts_user_kind_idx
on public.analytics_ingestion_receipts (user_id, ingestion_kind, created_at desc);

create table if not exists public.analytics_growth_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  period_grain text not null check (period_grain in ('hour', 'day')),
  bucket_key text not null,
  snapshot_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb,
  lifecycle_status text not null default 'active' check (lifecycle_status in ('active', 'superseded', 'archived')),
  idempotency_key text not null,
  superseded_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index if not exists analytics_growth_snapshots_active_idx
on public.analytics_growth_snapshots (user_id, platform, period_grain, lifecycle_status, snapshot_at desc);

create unique index if not exists analytics_rollups_bucket_unique
on public.analytics_rollups (workspace_id, platform, grain, bucket_key);

alter table public.analytics_ingestion_receipts enable row level security;
alter table public.analytics_growth_snapshots enable row level security;

drop policy if exists "analytics_ingestion_receipts_owner_select" on public.analytics_ingestion_receipts;
create policy "analytics_ingestion_receipts_owner_select" on public.analytics_ingestion_receipts
for select using (auth.uid() = user_id);

drop policy if exists "analytics_growth_snapshots_owner_select" on public.analytics_growth_snapshots;
create policy "analytics_growth_snapshots_owner_select" on public.analytics_growth_snapshots
for select using (auth.uid() = user_id);
