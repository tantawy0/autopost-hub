import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { ValidationError } from "@/lib/auth";
import { assertPlanCapacity } from "@/lib/server/billing/limits";
import type {
  ConnectedAccountDTO,
  MediaAssetDTO,
  MediaType,
  Platform,
  PostCardDTO,
  SavePostInput,
} from "@/lib/types";
import {
  normalizeConnectedAccountStatus,
  normalizePlatform,
  normalizePostStatus,
} from "@/lib/types";
import {
  MEDIA_BUCKET,
  buildMediaStoragePath,
  inferMediaType,
  validateMediaFile,
} from "@/lib/validation/media";
import {
  validatePostContent,
  validateScheduleTime,
} from "@/lib/validation/scheduling";
import type { WorkspaceContext } from "@/lib/workspaces";

type PostRow = {
  id: string;
  caption?: string | null;
  first_comment?: string | null;
  image_url?: string | null;
  platforms?: string[] | null;
  status?: string | null;
  schedule_time?: string | null;
  scheduled_for?: string | null;
  published_at?: string | null;
  failure_summary?: string | null;
  internal_notes?: string | null;
  post_format?: string | null;
  approval_requested?: boolean | null;
  approval_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MediaAssetRow = {
  id?: string | null;
  public_url?: string | null;
  media_type?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
};

type ConnectedAccountRow = {
  id: string;
  platform: string;
  account_name?: string | null;
  name?: string | null;
  status?: string | null;
  reconnect_required?: boolean | null;
};

type ExistingPostRow = {
  id: string;
  status?: string | null;
};

const POST_SELECT =
  "id, caption, first_comment, image_url, platforms, status, schedule_time, scheduled_for, published_at, failure_summary, internal_notes, post_format, approval_requested, approval_status, created_at, updated_at";
const LEGACY_POST_SELECT =
  "id, caption, first_comment, image_url, platforms, status, schedule_time, scheduled_for, published_at, failure_summary, created_at, updated_at";

function isMissingPostMetadata(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && /internal_notes|post_format|approval_requested|approval_status|schema cache|does not exist/i.test(error.message));
}

function uniquePlatforms(platforms: Platform[]): Platform[] {
  return Array.from(new Set(platforms));
}

function sanitizePostFormat(value: SavePostInput["postFormat"]) {
  return value === "Reel" || value === "Story" ? value : "Post";
}

function toMediaAssetDTO(row: MediaAssetRow): MediaAssetDTO | null {
  if (!row.public_url) return null;

  const mediaType: MediaType =
    row.media_type === "image" || row.media_type === "video" ? row.media_type : "unknown";

  return {
    id: row.id ?? undefined,
    url: row.public_url,
    mediaType,
    mimeType: row.mime_type ?? undefined,
    sizeBytes: row.size_bytes ?? undefined,
    storageBucket: row.storage_bucket ?? undefined,
    storagePath: row.storage_path ?? undefined,
  };
}

function toConnectedAccountDTO(row: ConnectedAccountRow): ConnectedAccountDTO {
  const platform = normalizePlatform(row.platform);
  const status = normalizeConnectedAccountStatus(row.status);
  const reconnectRequired =
    Boolean(row.reconnect_required) ||
    status === "Expired" ||
    status === "Revoked" ||
    status === "Unauthorized";

  return {
    id: row.id,
    platform,
    accountName: row.account_name ?? row.name ?? `${platform} Account`,
    status,
    reconnectRequired,
    publishCapable: platform !== "TikTok" && status === "Connected" && !reconnectRequired,
  };
}

export function toPostCardDTO(row: PostRow): PostCardDTO {
  const imageUrl = row.image_url ?? null;
  const media: MediaAssetDTO[] = imageUrl
    ? [
        {
          url: imageUrl,
          mediaType: "unknown",
        },
      ]
    : [];

  return {
    id: row.id,
    caption: row.caption ?? "",
    firstComment: row.first_comment ?? "",
    imageUrl,
    media,
    platforms: uniquePlatforms((row.platforms ?? []).map((platform) => normalizePlatform(platform))),
    status: normalizePostStatus(row.status),
    scheduledFor: row.scheduled_for ?? row.schedule_time ?? null,
    publishedAt: row.published_at ?? null,
    failureSummary: row.failure_summary ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    attempts: [],
    internalNotes: row.internal_notes ?? "",
    postFormat: sanitizePostFormat(row.post_format as SavePostInput["postFormat"]),
    approvalRequested: Boolean(row.approval_requested),
    approvalStatus:
      row.approval_status === "Approved" || row.approval_status === "Changes Requested"
        ? row.approval_status
        : row.approval_requested
          ? "Requested"
          : "None",
  };
}

function withMediaAssets(post: PostCardDTO, mediaAssets: MediaAssetDTO[]): PostCardDTO {
  if (mediaAssets.length === 0) return post;

  return {
    ...post,
    imageUrl: mediaAssets[0].url,
    media: mediaAssets,
  };
}

async function listPostMediaAssets(
  client: SupabaseClient,
  userId: string,
  postIds: string[],
) {
  if (postIds.length === 0) return new Map<string, MediaAssetDTO[]>();

  const { data, error } = await client
    .from("media_assets")
    .select("id, post_id, public_url, media_type, mime_type, size_bytes, storage_bucket, storage_path, created_at")
    .eq("user_id", userId)
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  const grouped = new Map<string, MediaAssetDTO[]>();

  if (error) {
    if (/relation .*media_assets|schema cache|does not exist/i.test(error.message)) return grouped;
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const postId = (row as { post_id?: string }).post_id;
    const asset = toMediaAssetDTO(row as MediaAssetRow);

    if (!postId || !asset) continue;

    grouped.set(postId, [...(grouped.get(postId) ?? []), asset]);
  }

  return grouped;
}

async function recordActivity(
  client: SupabaseClient,
  input: {
    workspaceId: string | null;
    userId: string;
    eventType: string;
    message: string;
    metadata?: Record<string, unknown>;
    postId?: string;
  },
) {
  await client
    .from("activity_events")
    .insert([
      {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        actor_user_id: input.userId,
        post_id: input.postId,
        event_type: input.eventType,
        message: input.message,
        metadata: input.metadata ?? {},
      },
    ])
    .then(({ error }) => {
      if (error && /workspace_id|actor_user_id|schema cache/i.test(error.message)) {
        return client
          .from("activity_events")
          .insert([
            {
              user_id: input.userId,
              post_id: input.postId,
              event_type: input.eventType,
              message: input.message,
              metadata: input.metadata ?? {},
            },
          ])
          .then(() => undefined);
      }

      return undefined;
    });
}

async function getExistingPost(
  client: SupabaseClient,
  userId: string,
  postId?: string,
): Promise<ExistingPostRow | null> {
  if (!postId) return null;

  const { data, error } = await client
    .from("posts")
    .select("id, status")
    .eq("id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as ExistingPostRow | null) ?? null;
}

async function listPublishReadyAccounts(
  client: SupabaseClient,
  input: {
    userId: string;
    workspaceId: string | null;
    platforms: Platform[];
    accountIds?: string[];
  },
): Promise<ConnectedAccountDTO[]> {
  let query = client
    .from("connected_accounts")
    .select("id, platform, account_name, status, reconnect_required, created_at")
    .eq("user_id", input.userId)
    .in("platform", input.platforms);

  if (input.workspaceId) {
    query = query.eq("workspace_id", input.workspaceId);
  }

  if (input.accountIds?.length) {
    query = query.in("id", input.accountIds);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    if (/relation .*connected_accounts|schema cache|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => toConnectedAccountDTO(row as ConnectedAccountRow))
    .filter((account) => account.publishCapable);
}

function validateSaveInput(input: SavePostInput) {
  const contentError = validatePostContent(
    input.caption,
    input.imageUrl || input.mediaAssets?.[0]?.url || null,
  );

  if (contentError) throw new ValidationError(contentError);

  if (input.status !== "Draft" && input.status !== "Scheduled") {
    throw new ValidationError("Unsupported post status.");
  }

  if (input.platforms.length === 0) {
    throw new ValidationError("Select at least one connected publishing destination.");
  }

  if (
    input.destinationAccountIds !== undefined &&
    (!Array.isArray(input.destinationAccountIds) ||
      input.destinationAccountIds.some((id) => typeof id !== "string" || id.trim().length === 0))
  ) {
    throw new ValidationError("Invalid publishing destination.");
  }

  if (input.status === "Scheduled") {
    const scheduleError = validateScheduleTime(input.scheduledFor);
    if (scheduleError) throw new ValidationError(scheduleError);
  }
}

export async function savePostForUser(
  client: SupabaseClient,
  input: {
    user: User;
    workspace: WorkspaceContext;
    post: SavePostInput;
  },
): Promise<PostCardDTO> {
  const workspaceId = input.workspace.workspaceId;

  if (!workspaceId) throw new ValidationError("Workspace is required.");

  validateSaveInput(input.post);

  const existing = await getExistingPost(client, input.user.id, input.post.postId);
  const selectedPlatforms = uniquePlatforms(
    input.post.platforms.map((platform) => normalizePlatform(platform)),
  );
  const selectedDestinationIds = Array.from(
    new Set((input.post.destinationAccountIds ?? []).map((id) => id.trim()).filter(Boolean)),
  );
  const scheduledIncrement =
    input.post.status === "Scheduled" && normalizePostStatus(existing?.status) !== "Scheduled" ? 1 : 0;

  if (scheduledIncrement > 0) {
    await assertPlanCapacity(client, {
      workspaceId,
      metric: "scheduledPostsMonthly",
      increment: scheduledIncrement,
    });
  }

  const payload = {
    workspace_id: workspaceId,
    user_id: input.user.id,
    caption: input.post.caption.trim(),
    first_comment: input.post.firstComment.trim() || null,
    image_url: input.post.imageUrl,
    platforms: selectedPlatforms.map((platform) => platform.toLowerCase()),
    status: input.post.status,
    lifecycle_status: input.post.status === "Scheduled" ? "scheduled" : "draft",
    schedule_time: input.post.status === "Scheduled" ? input.post.scheduledFor : null,
    scheduled_for: input.post.status === "Scheduled" ? input.post.scheduledFor : null,
    published_at: null,
    internal_notes: input.post.internalNotes?.trim() || null,
    post_format: sanitizePostFormat(input.post.postFormat),
    approval_requested: Boolean(input.post.approvalRequested),
    approval_status: input.post.approvalRequested ? "Requested" : "None",
    updated_at: new Date().toISOString(),
  };

  const runSave = (body: Record<string, unknown>, select = POST_SELECT) =>
    input.post.postId
      ? client
          .from("posts")
          .update(body)
          .eq("id", input.post.postId)
          .eq("user_id", input.user.id)
          .select(select)
          .single()
      : client
          .from("posts")
          .insert([{ ...body, created_at: new Date().toISOString() }])
          .select(select)
          .single();

  let { data, error } = await runSave(payload);

  if (error && (isMissingPostMetadata(error) || /scheduled_for|lifecycle_status|workspace_id/i.test(error.message))) {
    const {
      internal_notes,
      post_format,
      approval_requested,
      approval_status,
      scheduled_for,
      lifecycle_status,
      workspace_id,
      ...legacyPayload
    } = payload;
    void internal_notes;
    void post_format;
    void approval_requested;
    void approval_status;
    void scheduled_for;
    void lifecycle_status;
    void workspace_id;
    const fallback = await runSave(legacyPayload, LEGACY_POST_SELECT);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);

  const saved = toPostCardDTO(data as unknown as PostRow);
  const mediaIds = (input.post.mediaAssets ?? []).map((asset) => asset.id).filter(Boolean);

  if (mediaIds.length > 0) {
    const { error: mediaError } = await client
      .from("media_assets")
      .update({ post_id: saved.id })
      .eq("user_id", input.user.id)
      .in("id", mediaIds);

    if (mediaError && !/relation .*media_assets|schema cache|does not exist/i.test(mediaError.message)) {
      throw new Error(mediaError.message);
    }
  }

  const selectedAccounts = await listPublishReadyAccounts(client, {
    userId: input.user.id,
    workspaceId,
    platforms: selectedPlatforms,
    accountIds: selectedDestinationIds,
  });

  if (input.post.status === "Scheduled" && selectedAccounts.length === 0) {
    throw new ValidationError("Select at least one connected publishing destination.");
  }

  if (selectedDestinationIds.length > 0) {
    const foundIds = new Set(selectedAccounts.map((account) => account.id));
    const missingIds = selectedDestinationIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new ValidationError("One or more selected destinations are no longer publish-ready.");
    }
  }

  const destinationRows = selectedAccounts.map((account) => ({
    workspace_id: workspaceId,
    user_id: input.user.id,
    post_id: saved.id,
    connected_account_id: account.id,
    platform: account.platform,
    status: input.post.status === "Scheduled" ? "scheduled" : "selected",
  }));

  const destinationDelete = await client
    .from("post_destinations")
    .delete()
    .eq("post_id", saved.id)
    .eq("user_id", input.user.id);

  if (destinationDelete.error && !/post_destinations|schema cache|does not exist/i.test(destinationDelete.error.message)) {
    throw new Error(destinationDelete.error.message);
  }

  if (destinationRows.length > 0) {
    const { error: destinationError } = await client
      .from("post_destinations")
      .upsert(destinationRows, { onConflict: "post_id,connected_account_id" });

    if (destinationError && !/post_destinations|schema cache|does not exist/i.test(destinationError.message)) {
      throw new Error(destinationError.message);
    }
  }

  await recordActivity(client, {
    workspaceId,
    userId: input.user.id,
    postId: saved.id,
    eventType: input.post.status === "Scheduled" ? "post.scheduled" : "post.draft_saved",
    message: input.post.status === "Scheduled" ? "Post scheduled" : "Draft saved",
    metadata: {
      platforms: selectedPlatforms,
      approvalRequested: Boolean(input.post.approvalRequested),
    },
  });

  const mediaByPost = await listPostMediaAssets(client, input.user.id, [saved.id]);

  return withMediaAssets(saved, mediaByPost.get(saved.id) ?? []);
}

export async function uploadMediaAssetForUser(
  client: SupabaseClient,
  input: {
    user: User;
    workspace: WorkspaceContext;
    file: File;
  },
): Promise<MediaAssetDTO> {
  const workspaceId = input.workspace.workspaceId;

  if (!workspaceId) throw new ValidationError("Workspace is required.");

  const validationError = validateMediaFile(input.file);

  if (validationError) throw new ValidationError(validationError);

  await assertPlanCapacity(client, {
    workspaceId,
    metric: "mediaStorageMb",
    increment: input.file.size / 1024 / 1024,
  });

  const filePath = buildMediaStoragePath({
    userId: input.user.id,
    workspaceId,
    file: input.file,
  });
  const mediaType = inferMediaType(input.file);
  const upload = await client.storage.from(MEDIA_BUCKET).upload(filePath, input.file, {
    contentType: input.file.type,
    upsert: false,
  });

  if (upload.error) throw new Error(upload.error.message);

  const { data: publicUrl } = client.storage.from(MEDIA_BUCKET).getPublicUrl(filePath);
  const { data: insertedAsset, error: assetError } = await client
    .from("media_assets")
    .insert([
      {
        workspace_id: workspaceId,
        user_id: input.user.id,
        storage_bucket: MEDIA_BUCKET,
        storage_path: filePath,
        public_url: publicUrl.publicUrl,
        media_type: mediaType,
        mime_type: input.file.type,
        size_bytes: input.file.size,
      },
    ])
    .select("id, public_url, media_type, mime_type, size_bytes, storage_bucket, storage_path")
    .single();

  if (assetError) {
    await client.storage.from(MEDIA_BUCKET).remove([filePath]).catch(() => undefined);
    throw new Error(assetError.message);
  }

  const asset = toMediaAssetDTO(insertedAsset as unknown as MediaAssetRow);

  if (!asset) {
    await client.storage.from(MEDIA_BUCKET).remove([filePath]).catch(() => undefined);
    throw new Error("Media asset record could not be created.");
  }

  await recordActivity(client, {
    workspaceId,
    userId: input.user.id,
    eventType: "media.uploaded",
    message: "Media asset uploaded",
    metadata: { mediaAssetId: asset.id, mediaType, sizeBytes: input.file.size },
  });

  return asset;
}
