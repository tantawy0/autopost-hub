alter table if exists public.connected_accounts
  drop constraint if exists connected_accounts_platform_check;

alter table if exists public.connected_accounts
  add constraint connected_accounts_platform_check
  check (platform in ('Facebook', 'Instagram', 'TikTok', 'LinkedIn'));

alter table if exists public.social_posts
  drop constraint if exists social_posts_platform_check;

alter table if exists public.social_posts
  add constraint social_posts_platform_check
  check (platform in ('Facebook', 'Instagram', 'TikTok', 'LinkedIn'));

alter table if exists public.post_destinations
  drop constraint if exists post_destinations_platform_check;

alter table if exists public.post_destinations
  add constraint post_destinations_platform_check
  check (platform in ('Facebook', 'Instagram', 'TikTok', 'LinkedIn'));

create index if not exists connected_accounts_user_platform_idx
on public.connected_accounts (user_id, platform, status);

create index if not exists social_posts_platform_timestamp_idx
on public.social_posts (platform, timestamp desc);
