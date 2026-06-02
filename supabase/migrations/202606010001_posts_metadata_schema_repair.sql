-- Repair older linked projects whose migration history predates the current
-- social SaaS metadata columns. This remains safe when the columns exist.
alter table if exists public.posts
  add column if not exists internal_notes text,
  add column if not exists post_format text not null default 'Post',
  add column if not exists approval_requested boolean not null default false,
  add column if not exists approval_status text not null default 'None';
