-- Queue + worker hardening: dead-letter, idempotency, background job types, recovery metadata

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'queue_job_status' and e.enumlabel = 'dead_letter'
  ) then
    alter type public.queue_job_status add value if not exists 'dead_letter';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'background_job_type') then
    create type public.background_job_type as enum (
      'publish_post',
      'analytics_ingest',
      'token_refresh',
      'social_sync'
    );
  end if;
end $$;

alter table if exists public.post_queue_jobs
  add column if not exists idempotency_key text,
  add column if not exists recovery_metadata jsonb not null default '{}'::jsonb,
  add column if not exists dead_lettered_at timestamptz;

update public.post_queue_jobs
set idempotency_key = 'publish:' || post_id::text
where idempotency_key is null;

create unique index if not exists post_queue_jobs_idempotency_active_unique
on public.post_queue_jobs (idempotency_key)
where status in ('queued', 'processing', 'retrying') and idempotency_key is not null;

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type public.background_job_type not null,
  status public.queue_job_status not null default 'queued',
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  idempotency_key text not null,
  last_error_code text,
  last_error_message text,
  payload jsonb not null default '{}'::jsonb,
  recovery_metadata jsonb not null default '{}'::jsonb,
  dead_lettered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists background_jobs_idempotency_active_unique
on public.background_jobs (idempotency_key)
where status in ('queued', 'processing', 'retrying');

create index if not exists background_jobs_claim_idx
on public.background_jobs (status, run_after, job_type, locked_at);

alter table public.background_jobs enable row level security;

drop policy if exists "background_jobs_owner_select" on public.background_jobs;
create policy "background_jobs_owner_select" on public.background_jobs
for select using (auth.uid() = user_id);
