-- Idempotent storage setup for post composer media.
-- Public bucket is required because Meta/Facebook/Instagram publishing APIs fetch media by URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  209715200,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post_images_owner_insert" on storage.objects;
drop policy if exists "post_images_owner_select" on storage.objects;
drop policy if exists "post_images_owner_update" on storage.objects;
drop policy if exists "post_images_owner_delete" on storage.objects;

create policy "post_images_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and auth.uid()::text = split_part(name, '/', 1)
  and (
    split_part(name, '/', 2) = 'personal'
    or exists (
      select 1
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.workspace_id::text = split_part(name, '/', 2)
    )
  )
);

create policy "post_images_owner_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'post-images'
  and auth.uid()::text = split_part(name, '/', 1)
  and (
    split_part(name, '/', 2) = 'personal'
    or exists (
      select 1
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.workspace_id::text = split_part(name, '/', 2)
    )
  )
);

create policy "post_images_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'post-images'
  and auth.uid()::text = split_part(name, '/', 1)
  and (
    split_part(name, '/', 2) = 'personal'
    or exists (
      select 1
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.workspace_id::text = split_part(name, '/', 2)
    )
  )
)
with check (
  bucket_id = 'post-images'
  and auth.uid()::text = split_part(name, '/', 1)
  and (
    split_part(name, '/', 2) = 'personal'
    or exists (
      select 1
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.workspace_id::text = split_part(name, '/', 2)
    )
  )
);

create policy "post_images_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'post-images'
  and auth.uid()::text = split_part(name, '/', 1)
  and (
    split_part(name, '/', 2) = 'personal'
    or exists (
      select 1
      from public.workspace_members wm
      where wm.user_id = auth.uid()
        and wm.workspace_id::text = split_part(name, '/', 2)
    )
  )
);
