# Storage Buckets

Last audited: 2026-06-02

## Required Bucket

| Bucket | Public | Used by | Path convention |
| --- | --- | --- | --- |
| `post-images` | Yes | `uploadMediaAsset` in `lib/posts.ts` | `<auth.uid()>/<workspace_id-or-personal>/<timestamp>-<uuid>.<safe-ext>` |

The app currently calls:

- `supabase.storage.from("post-images").upload(filePath, file)`
- `supabase.storage.from("post-images").getPublicUrl(filePath)`
- `media_assets.storage_bucket = "post-images"`
- `media_assets.storage_path = <auth user id>/<workspace id or personal>/<safe filename>`
- `media_assets.workspace_id = <current workspace id>` when the workspace schema is available

The bucket is intentionally public because Meta/Facebook/Instagram publishing APIs need provider-fetchable media URLs. The app still scopes object paths and database records by user/workspace. If the product later needs private pre-publish media, switch UI rendering to signed URLs and keep a provider-only public handoff URL at publish time.

## Required Storage Policies

Migration `supabase/migrations/202605260001_storage_post_images_bucket.sql` creates the bucket and these Supabase Storage policies for `storage.objects` scoped to `bucket_id = 'post-images'`.

```sql
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
```

Bucket creation:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  209715200,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

## Audit Result

- Database table `media_assets` has RLS enabled and owner-scoped policies.
- Upload paths are prefixed by authenticated `user.id` and current workspace id when available.
- Client upload validation and publish-time stored media validation enforce allowed MIME types, max size, secure public URL, expected bucket, and user/workspace path scope.
- Publishing prefers stored `media_assets` for the post and falls back to legacy `posts.image_url` only when no stored asset records are available.
- Storage bucket creation and storage policies are present in the checked-in Supabase migrations and applied to the linked project.

## Production Checks

- Max upload size should match `lib/validation/media.ts` limits.
- MIME types should allow images and videos only.
- CDN/cache settings should be reviewed if replacing public media is allowed.
- If private media is required later, switch from `getPublicUrl` to signed URLs and update UI render paths.
