-- AI provider layer: prompt versions, usage tracking, generation metadata

create table if not exists public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  version text not null,
  system_prompt text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (prompt_key, version)
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text,
  generation_type text not null,
  prompt_version text,
  status text not null default 'succeeded' check (status in ('succeeded', 'failed', 'fallback')),
  latency_ms integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_user_created_idx
on public.ai_usage_events (user_id, generation_type, created_at desc);

alter table if exists public.ai_generations
  add column if not exists prompt_version text,
  add column if not exists usage_event_id uuid references public.ai_usage_events(id) on delete set null;

insert into public.ai_prompt_versions (prompt_key, version, system_prompt, metadata, is_active)
values
  (
    'assistant_suggestions',
    '1.0.0',
    'You are AutoPost Hub''s creator growth assistant. Return ONLY a JSON array of exactly 3 concise, actionable suggestion strings. No markdown, no prose outside the JSON array.',
    jsonb_build_object('output', 'string[]', 'maxItems', 3),
    true
  ),
  (
    'content_score_review',
    '1.0.0',
    'You review short-form social captions for hook strength, clarity, and engagement potential.',
    jsonb_build_object('output', 'heuristic_score'),
    true
  )
on conflict (prompt_key, version) do nothing;

update public.ai_prompt_versions
set is_active = false
where prompt_key in ('assistant_suggestions', 'content_score_review')
  and version <> '1.0.0';

alter table public.ai_prompt_versions enable row level security;
alter table public.ai_usage_events enable row level security;

drop policy if exists "ai_prompt_versions_read" on public.ai_prompt_versions;
create policy "ai_prompt_versions_read" on public.ai_prompt_versions for select using (true);

drop policy if exists "ai_usage_events_owner_select" on public.ai_usage_events;
create policy "ai_usage_events_owner_select" on public.ai_usage_events for select using (auth.uid() = user_id);
