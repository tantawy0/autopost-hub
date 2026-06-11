import type {
  ConnectedAccountDTO,
  DashboardSummaryDTO,
  MediaAssetDTO,
  MediaType,
  Platform,
  PostCardDTO,
  SavePostInput,
} from "@/lib/types";
import { normalizePlatform, normalizePostStatus } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getClientUser } from "@/lib/auth";
import { listConnectedAccounts } from "@/lib/channels";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { validateMediaFile } from "@/lib/validation/media";

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

async function listPostMediaAssets(userId: string, postIds: string[]) {
  if (postIds.length === 0) return new Map<string, MediaAssetDTO[]>();

  const { data, error } = await supabase
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
  userId: string,
  eventType: string,
  message: string,
  metadata: Record<string, unknown> = {},
  postId?: string,
) {
  await supabase
    .from("activity_events")
    .insert([{ user_id: userId, post_id: postId, event_type: eventType, message, metadata }])
    .then(() => undefined);
}

export async function listMediaAssets(): Promise<MediaAssetDTO[]> {
  const user = await getClientUser();
  const { data, error } = await supabase
    .from("media_assets")
    .select("id, public_url, media_type, mime_type, size_bytes, storage_bucket, storage_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (/relation .*media_assets|schema cache|does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => toMediaAssetDTO(row as MediaAssetRow))
    .filter((asset): asset is MediaAssetDTO => Boolean(asset));
}

export async function deleteMediaAsset(asset: MediaAssetDTO): Promise<void> {
  if (!asset.id) throw new Error("Media asset record was not found.");

  const user = await getClientUser();

  if (asset.storageBucket && asset.storagePath) {
    const { error: storageError } = await supabase.storage
      .from(asset.storageBucket)
      .remove([asset.storagePath]);

    if (storageError) throw new Error(storageError.message);
  }

  const { error } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", asset.id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  await recordActivity(user.id, "media.deleted", "Media asset deleted", { mediaAssetId: asset.id });
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
    postFormat: row.post_format === "Reel" || row.post_format === "Story" ? row.post_format : "Post",
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

export async function getPost(postId: string): Promise<PostCardDTO | null> {
  const user = await getClientUser();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (isMissingPostMetadata(error) || /lifecycle_status/i.test(error?.message ?? "")) {
    const legacy = await supabase
      .from("posts")
      .select(LEGACY_POST_SELECT)
      .eq("id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (legacy.error) throw new Error(legacy.error.message);

    if (!legacy.data) return null;

    const post = toPostCardDTO(legacy.data as PostRow);
    const mediaByPost = await listPostMediaAssets(user.id, [post.id]);

    return withMediaAssets(post, mediaByPost.get(post.id) ?? []);
  }

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const post = toPostCardDTO(data as PostRow);
  const mediaByPost = await listPostMediaAssets(user.id, [post.id]);

  return withMediaAssets(post, mediaByPost.get(post.id) ?? []);
}

export async function getDashboardSummary(): Promise<DashboardSummaryDTO> {
  const user = await getClientUser();
  const countPosts = async (status?: PostCardDTO["status"]) => {
    let query = supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (status) {
      query = query.eq("status", status);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  };

  const scheduledQueueQuery = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("user_id", user.id)
    .eq("status", "Scheduled")
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .order("schedule_time", { ascending: true, nullsFirst: false })
    .limit(6);

  const draftQueueQuery = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("user_id", user.id)
    .eq("status", "Draft")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(6);

  const recentPublishedQuery = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("user_id", user.id)
    .in("status", ["Published", "Partially Published", "Failed"])
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(50);

  const [
    totalPosts,
    draftPosts,
    scheduledPosts,
    publishedPosts,
    partiallyPublishedPosts,
    failedPosts,
    connectedChannels,
    scheduledQueueResult,
    draftQueueResult,
    recentPublishedResult,
  ] = await Promise.all([
    countPosts(),
    countPosts("Draft"),
    countPosts("Scheduled"),
    countPosts("Published"),
    countPosts("Partially Published"),
    countPosts("Failed"),
    listConnectedAccounts(),
    scheduledQueueQuery,
    draftQueueQuery,
    recentPublishedQuery,
  ]);

  if (isMissingPostMetadata(scheduledQueueResult.error) || isMissingPostMetadata(draftQueueResult.error) || isMissingPostMetadata(recentPublishedResult.error)) {
    const [legacyScheduled, legacyDrafts, legacyRecent] = await Promise.all([
      supabase
        .from("posts")
        .select(LEGACY_POST_SELECT)
        .eq("user_id", user.id)
        .eq("status", "Scheduled")
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .order("schedule_time", { ascending: true, nullsFirst: false })
        .limit(6),
      supabase
        .from("posts")
        .select(LEGACY_POST_SELECT)
        .eq("user_id", user.id)
        .eq("status", "Draft")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(6),
      supabase
        .from("posts")
        .select(LEGACY_POST_SELECT)
        .eq("user_id", user.id)
        .in("status", ["Published", "Partially Published", "Failed"])
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(50),
    ]);

    if (legacyScheduled.error) throw new Error(legacyScheduled.error.message);
    if (legacyDrafts.error) throw new Error(legacyDrafts.error.message);
    if (legacyRecent.error) throw new Error(legacyRecent.error.message);

    const scheduledQueue = (legacyScheduled.data ?? []).map((row) => toPostCardDTO(row as PostRow));
    const draftQueue = (legacyDrafts.data ?? []).map((row) => toPostCardDTO(row as PostRow));
    const recentPublished = (legacyRecent.data ?? []).map((row) => toPostCardDTO(row as PostRow));
    const mediaByPost = await listPostMediaAssets(user.id, [...scheduledQueue, ...draftQueue, ...recentPublished].map((post) => post.id));

    return {
      counts: {
        totalPosts,
        draftPosts,
        scheduledPosts,
        publishedPosts,
        partiallyPublishedPosts,
        failedPosts,
        connectedChannels: connectedChannels.filter((channel) => channel.status === "Connected").length,
      },
      draftQueue: draftQueue.map((post) => withMediaAssets(post, mediaByPost.get(post.id) ?? [])),
      scheduledQueue: scheduledQueue.map((post) => withMediaAssets(post, mediaByPost.get(post.id) ?? [])),
      recentPublished: recentPublished.map((post) => withMediaAssets(post, mediaByPost.get(post.id) ?? [])),
      connectedChannels,
    };
  }

  if (scheduledQueueResult.error) {
    throw new Error(scheduledQueueResult.error.message);
  }

  if (draftQueueResult.error) {
    throw new Error(draftQueueResult.error.message);
  }

  if (recentPublishedResult.error) {
    throw new Error(recentPublishedResult.error.message);
  }

  const scheduledQueue = (scheduledQueueResult.data ?? []).map((row) => toPostCardDTO(row as PostRow));
  const draftQueue = (draftQueueResult.data ?? []).map((row) => toPostCardDTO(row as PostRow));
  const recentPublished = (recentPublishedResult.data ?? []).map((row) => toPostCardDTO(row as PostRow));
  const mediaByPost = await listPostMediaAssets(user.id, [...scheduledQueue, ...draftQueue, ...recentPublished].map((post) => post.id));

  return {
    counts: {
      totalPosts,
      draftPosts,
      scheduledPosts,
      publishedPosts,
      partiallyPublishedPosts,
      failedPosts,
      connectedChannels: connectedChannels.filter((channel) => channel.status === "Connected").length,
    },
    draftQueue: draftQueue.map((post) => withMediaAssets(post, mediaByPost.get(post.id) ?? [])),
    scheduledQueue: scheduledQueue.map((post) => withMediaAssets(post, mediaByPost.get(post.id) ?? [])),
    recentPublished: recentPublished.map((post) => withMediaAssets(post, mediaByPost.get(post.id) ?? [])),
    connectedChannels,
  };
}

export async function listPostsByStatus(statuses: PostCardDTO["status"][]): Promise<PostCardDTO[]> {
  const user = await getClientUser();
  let { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("user_id", user.id)
    .in("status", statuses)
    .order("created_at", { ascending: false });

  if (isMissingPostMetadata(error) || /lifecycle_status/i.test(error?.message ?? "")) {
    const legacy = await supabase
      .from("posts")
      .select(LEGACY_POST_SELECT)
      .eq("user_id", user.id)
      .in("status", statuses)
      .order("created_at", { ascending: false });
    data = legacy.data as typeof data;
    error = legacy.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  const posts = (data ?? []).map((row) => toPostCardDTO(row as PostRow));
  const mediaByPost = await listPostMediaAssets(user.id, posts.map((post) => post.id));

  return posts.map((post) => withMediaAssets(post, mediaByPost.get(post.id) ?? []));
}

export async function savePost(input: SavePostInput): Promise<PostCardDTO> {
  const response = await fetch("/api/posts/save", {
    method: "POST",
    headers: await getClientAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => null)) as
    | (PostCardDTO & { message?: string })
    | null;

  if (!response.ok || !body) {
    throw new Error(body?.message ?? "Unable to save post.");
  }

  return body;
}

export async function reschedulePost(postId: string, scheduledFor: string): Promise<PostCardDTO> {
  const user = await getClientUser();
  let { data, error } = await supabase
    .from("posts")
    .update({
      status: "Scheduled",
      lifecycle_status: "scheduled",
      schedule_time: scheduledFor,
      scheduled_for: scheduledFor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", user.id)
    .select(POST_SELECT)
    .single();

  if (isMissingPostMetadata(error)) {
    const fallback = await supabase
      .from("posts")
      .update({
        status: "Scheduled",
        schedule_time: scheduledFor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("user_id", user.id)
      .select(LEGACY_POST_SELECT)
      .single();

    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  await recordActivity(user.id, "post.rescheduled", "Post rescheduled", { scheduledFor }, postId);

  return toPostCardDTO(data as PostRow);
}

export async function deletePost(postId: string): Promise<void> {
  const user = await getClientUser();
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  await recordActivity(user.id, "post.deleted", "Post deleted", {}, postId);
}

export async function publishPostClient(postId: string, destinations?: ConnectedAccountDTO[]): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const post = await getPost(postId);

  if (!post) {
    throw new Error("Post was not found.");
  }

  const destinationAccountIds = destinations
    ?.filter((destination) => post.platforms.includes(destination.platform))
    .map((destination) => destination.id);

  if (destinations && (!destinationAccountIds || destinationAccountIds.length === 0)) {
    throw new Error("No publish-ready destination matches this post's selected platforms.");
  }

  const response = await fetch(`/api/posts/${postId}/publish-now`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(destinationAccountIds ? { destinationAccountIds } : {}),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Unable to publish this post.");
  }
}

export async function uploadMediaAsset(file: File): Promise<MediaAssetDTO> {
  const validationError = validateMediaFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/media/upload", {
    method: "POST",
    headers: await getClientAuthHeaders(),
    body: formData,
  });
  const body = (await response.json().catch(() => null)) as
    | (MediaAssetDTO & { message?: string })
    | null;

  if (!response.ok || !body) {
    throw new Error(body?.message ?? "Upload failed.");
  }

  return body;
}
