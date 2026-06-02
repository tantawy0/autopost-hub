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

alter table public.social_posts enable row level security;

drop policy if exists "social_posts_owner_all" on public.social_posts;
create policy "social_posts_owner_all" on public.social_posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table if exists public.posts
  add column if not exists external_post_id text;

alter table if exists public.social_posts
  add column if not exists reactions_count integer,
  add column if not exists engagement_rate numeric,
  add column if not exists views_count integer,
  add column if not exists shares_count integer,
  add column if not exists saves_count integer,
  add column if not exists follows_count integer,
  add column if not exists reach_count integer;
