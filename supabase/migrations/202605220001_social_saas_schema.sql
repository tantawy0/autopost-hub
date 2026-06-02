create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_status') then
    create type public.post_status as enum ('Draft', 'Scheduled', 'Published', 'Partially Published', 'Failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'connected_account_status') then
    create type public.connected_account_status as enum ('Connected', 'Disconnected', 'Expired', 'Revoked', 'Unauthorized', 'Placeholder');
  end if;

  if not exists (select 1 from pg_type where typname = 'publishing_attempt_status') then
    create type public.publishing_attempt_status as enum ('Pending', 'Publishing', 'Succeeded', 'Failed', 'Skipped');
  end if;
end $$;

alter table if exists public.posts
  add column if not exists first_comment text,
  add column if not exists scheduled_for timestamptz,
  add column if not exists failure_summary text,
  add column if not exists internal_notes text,
  add column if not exists post_format text not null default 'Post',
  add column if not exists approval_requested boolean not null default false,
  add column if not exists approval_status text not null default 'None',
  add column if not exists updated_at timestamptz default now();

update public.posts
set scheduled_for = schedule_time
where scheduled_for is null
  and schedule_time is not null;

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

do $$
begin
  if to_regclass('public.channels') is not null then
    insert into public.connected_accounts (
      user_id,
      platform,
      account_name,
      account_id,
      status,
      reconnect_required
    )
    select
      user_id,
      case lower(platform)
        when 'facebook' then 'Facebook'
        when 'instagram' then 'Instagram'
        when 'tiktok' then 'TikTok'
        else 'Facebook'
      end,
      coalesce(name, platform || ' Account'),
      id::text,
      case when lower(platform) = 'tiktok' then 'Placeholder'::public.connected_account_status else 'Connected'::public.connected_account_status end,
      lower(platform) = 'tiktok'
    from public.channels
    on conflict (user_id, platform, account_id) do nothing;
  end if;
end $$;

alter table if exists public.posts enable row level security;
alter table public.media_assets enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.publishing_attempts enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;
alter table public.analytics_daily enable row level security;

drop policy if exists "posts_owner_select" on public.posts;
create policy "posts_owner_select" on public.posts for select using (auth.uid() = user_id);

drop policy if exists "posts_owner_insert" on public.posts;
create policy "posts_owner_insert" on public.posts for insert with check (auth.uid() = user_id);

drop policy if exists "posts_owner_update" on public.posts;
create policy "posts_owner_update" on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "posts_owner_delete" on public.posts;
create policy "posts_owner_delete" on public.posts for delete using (auth.uid() = user_id);

drop policy if exists "media_assets_owner_all" on public.media_assets;
create policy "media_assets_owner_all" on public.media_assets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "connected_accounts_owner_all" on public.connected_accounts;
create policy "connected_accounts_owner_all" on public.connected_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "publishing_attempts_owner_select" on public.publishing_attempts;
create policy "publishing_attempts_owner_select" on public.publishing_attempts for select using (auth.uid() = user_id);

drop policy if exists "publishing_attempts_owner_insert" on public.publishing_attempts;
create policy "publishing_attempts_owner_insert" on public.publishing_attempts for insert with check (auth.uid() = user_id);

drop policy if exists "publishing_attempts_owner_update" on public.publishing_attempts;
create policy "publishing_attempts_owner_update" on public.publishing_attempts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "activity_events_owner_all" on public.activity_events;
create policy "activity_events_owner_all" on public.activity_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications_owner_all" on public.notifications;
create policy "notifications_owner_all" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "analytics_daily_owner_all" on public.analytics_daily;
create policy "analytics_daily_owner_all" on public.analytics_daily for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
