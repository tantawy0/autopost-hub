-- Meta App Review readiness: map Meta app-scoped users to connected accounts
-- and record data deletion callback requests without exposing provider tokens.

alter table if exists public.connected_accounts
  add column if not exists provider_user_id_hash text;

create index if not exists connected_accounts_provider_user_hash_idx
on public.connected_accounts (provider_user_id_hash)
where provider_user_id_hash is not null;

create table if not exists public.platform_data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('Meta')),
  provider_user_id_hash text not null,
  confirmation_code text not null unique,
  status text not null default 'received' check (status in ('received', 'processed', 'no_match', 'failed')),
  matched_user_ids uuid[] not null default '{}'::uuid[],
  matched_connected_account_ids uuid[] not null default '{}'::uuid[],
  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.platform_data_deletion_requests enable row level security;

create index if not exists platform_data_deletion_requests_provider_hash_idx
on public.platform_data_deletion_requests (provider, provider_user_id_hash, requested_at desc);

create index if not exists platform_data_deletion_requests_confirmation_idx
on public.platform_data_deletion_requests (confirmation_code);
