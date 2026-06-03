do $$
begin
  if not exists (select 1 from pg_type where typname = 'billing_plan_key') then
    create type public.billing_plan_key as enum ('free', 'creator', 'pro', 'agency', 'enterprise');
  end if;
end $$;

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stripe_customer_id text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id),
  unique (user_id, workspace_id)
);

create table if not exists public.workspace_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  plan_key public.billing_plan_key not null default 'free',
  status text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  seats integer not null default 1 check (seats > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  stripe_event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

insert into public.workspace_subscriptions (workspace_id, plan_key, status)
select id, 'free'::public.billing_plan_key, 'free'
from public.workspaces
on conflict (workspace_id) do nothing;

create index if not exists billing_customers_user_idx
on public.billing_customers (user_id, workspace_id);

create index if not exists workspace_subscriptions_workspace_status_idx
on public.workspace_subscriptions (workspace_id, status);

create index if not exists workspace_subscriptions_customer_idx
on public.workspace_subscriptions (stripe_customer_id);

create index if not exists billing_events_workspace_processed_idx
on public.billing_events (workspace_id, processed_at desc);

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

alter table public.billing_customers enable row level security;
alter table public.workspace_subscriptions enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "billing_customers_member_select" on public.billing_customers;
create policy "billing_customers_member_select"
on public.billing_customers for select
using (auth.uid() = user_id or public.is_workspace_member(workspace_id));

drop policy if exists "workspace_subscriptions_member_select" on public.workspace_subscriptions;
create policy "workspace_subscriptions_member_select"
on public.workspace_subscriptions for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "billing_events_member_select" on public.billing_events;
create policy "billing_events_member_select"
on public.billing_events for select
using (workspace_id is not null and public.is_workspace_member(workspace_id));
