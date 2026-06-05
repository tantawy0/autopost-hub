import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProviderPublishResult } from "@/lib/providers/facebook";
import { publishFacebookPagePost } from "@/lib/providers/facebook";
import { publishInstagramBusinessPost } from "@/lib/providers/instagram";
import { publishLinkedInMemberPost } from "@/lib/providers/linkedin";
import { refreshAccountTokenIfNeeded, verifyTokenBeforePublishing } from "@/lib/oauth-tokens";
import { writeAuditLog } from "@/lib/server/audit";
import { enqueueDuePosts } from "@/lib/server/queue";
import { runWorker } from "@/lib/server/jobs/worker";
import type { MediaAssetDTO, MediaType, PostStatus, PublishingAttemptDTO } from "@/lib/types";
import { isTerminalPostStatus, normalizePlatform, normalizePostStatus } from "@/lib/types";
import {
  PublishingException,
  PublishErrorCode,
  isRetryableError,
} from "@/lib/publishing-errors";
import { generatePublishIdempotencyKey } from "@/lib/publish-idempotency";
import { MEDIA_BUCKET, validateStoredMediaAsset } from "@/lib/validation/media";

type PostRow = {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  caption?: string | null;
  first_comment?: string | null;
  image_url?: string | null;
  status?: string | null;
  platforms?: string[] | null;
  schedule_time?: string | null;
  scheduled_for?: string | null;
};

type AccountRow = {
  id: string;
  user_id: string;
  platform: string;
  account_name?: string | null;
  account_id?: string | null;
  page_id?: string | null;
  instagram_business_account_id?: string | null;
  access_token?: string | null;
  token_ciphertext?: string | null;
  status?: string | null;
  reconnect_required?: boolean | null;
  provider_metadata?: Record<string, unknown> | null;
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

export interface PublishPostOptions {
  postId: string;
  userId?: string;
  destinationAccountIds?: string[];
  validateOnly?: boolean;
}

export interface PublishPostResult {
  postId: string;
  status: PostStatus;
  attempts: PublishingAttemptDTO[];
}

function mediaFromPost(post: PostRow): MediaAssetDTO[] {
  if (!post.image_url) return [];

  const mediaType: MediaType = /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(post.image_url)
    ? "video"
    : "image";

  return [
    {
      url: post.image_url,
      mediaType,
    },
  ];
}

async function loadPostMedia(client: SupabaseClient, post: PostRow): Promise<MediaAssetDTO[]> {
  const { data, error } = await client
    .from("media_assets")
    .select("id, public_url, media_type, mime_type, size_bytes, storage_bucket, storage_path, created_at")
    .eq("user_id", post.user_id)
    .eq("post_id", post.id)
    .eq("storage_bucket", MEDIA_BUCKET)
    .order("created_at", { ascending: true });

  if (error) {
    if (/relation .*media_assets|schema cache|does not exist/i.test(error.message)) {
      return mediaFromPost(post);
    }

    throw new Error(error.message);
  }

  const media = (data ?? [])
    .map((row) => {
      const asset = row as MediaAssetRow;
      const mediaType: MediaType =
        asset.media_type === "image" || asset.media_type === "video" ? asset.media_type : "unknown";

      return {
        id: asset.id ?? undefined,
        url: asset.public_url ?? "",
        mediaType,
        mimeType: asset.mime_type ?? undefined,
        sizeBytes: asset.size_bytes ?? undefined,
        storageBucket: asset.storage_bucket ?? undefined,
        storagePath: asset.storage_path ?? undefined,
      } satisfies MediaAssetDTO;
    })
    .filter((asset) => !validateStoredMediaAsset(asset, { userId: post.user_id, workspaceId: post.workspace_id }));

  return media.length > 0 ? media : mediaFromPost(post);
}

function aggregateStatus(attempts: PublishingAttemptDTO[]): PostStatus {
  const succeeded = attempts.filter((attempt) => attempt.status === "Succeeded").length;
  const failed = attempts.filter((attempt) => attempt.status === "Failed" || attempt.status === "Skipped").length;

  if (succeeded > 0 && failed === 0) return "Published";
  if (succeeded > 0 && failed > 0) return "Partially Published";

  return "Failed";
}

async function insertAttempt(
  client: SupabaseClient,
  post: PostRow,
  account: AccountRow,
  attempt: PublishingAttemptDTO,
) {
  // Extract error code if this is a failure
  let errorCode = null;

  if (attempt.status === "Failed") {
    // Try to extract structured error code from message
    if (attempt.message.includes("INVALID_TOKEN")) {
      errorCode = "INVALID_TOKEN";
    } else if (attempt.message.includes("TOKEN_EXPIRED")) {
      errorCode = "TOKEN_EXPIRED";
    } else if (attempt.message.includes("PERMISSION_DENIED")) {
      errorCode = "PERMISSION_DENIED";
    } else if (attempt.message.includes("RATE_LIMIT")) {
      errorCode = "PROVIDER_RATE_LIMIT";
    } else {
      errorCode = "PUBLISH_FAILED";
    }
  }

  await client.from("publishing_attempts").insert([
    {
      user_id: post.user_id,
      workspace_id: post.workspace_id ?? null,
      post_id: post.id,
      connected_account_id: account.id,
      platform: attempt.platform,
      destination_account_name: attempt.destinationAccountName,
      status: attempt.status,
      provider_post_id: attempt.providerPostId ?? null,
      error_code: errorCode,
      error_message: attempt.status === "Succeeded" ? null : attempt.message,
      recoverable:
        attempt.status !== "Succeeded" &&
        attempt.status !== "Skipped" &&
        (errorCode ? isRetryableError(errorCode as PublishErrorCode) : true),
      raw_error: attempt.status === "Succeeded" ? {} : { message: attempt.message, errorCode },
      started_at: new Date().toISOString(),
      finished_at: attempt.finishedAt ?? new Date().toISOString(),
    },
  ]);
}

async function publishToAccount(
  post: PostRow,
  account: AccountRow,
  validateOnly: boolean,
  media: MediaAssetDTO[],
): Promise<PublishingAttemptDTO> {
  const platform = normalizePlatform(account.platform);
  const accountName = account.account_name ?? `${platform} Account`;
  const idempotencyKey = generatePublishIdempotencyKey(post.id, account.id);

  // Check account connection status
  if (account.status !== "Connected" || account.reconnect_required) {
    return {
      destinationAccountId: account.id,
      platform,
      destinationAccountName: accountName,
      status: "Failed",
      message: `Account requires reconnection: ${accountName} is no longer connected.`,
      finishedAt: new Date().toISOString(),
    };
  }

  // Handle TikTok placeholder
  if (platform === "TikTok") {
    return {
      destinationAccountId: account.id,
      platform,
      destinationAccountName: accountName,
      status: "Skipped",
      message: "TikTok publishing support coming soon.",
      finishedAt: new Date().toISOString(),
    };
  }

  // Verify token is valid before publishing
  try {
    await verifyTokenBeforePublishing(account);
  } catch (error) {
    if (error instanceof PublishingException) {
      return {
        destinationAccountId: account.id,
        platform,
        destinationAccountName: accountName,
        status: "Failed",
        message: error.message,
        finishedAt: new Date().toISOString(),
      };
    }
    throw error;
  }

  if (!account.access_token) {
    return {
      destinationAccountId: account.id,
      platform,
      destinationAccountName: accountName,
      status: "Failed",
      message: "Missing OAuth token for publishing",
      finishedAt: new Date().toISOString(),
    };
  }

  try {
    let providerResult: ProviderPublishResult;

    if (platform === "Facebook") {
      providerResult = await publishFacebookPagePost({
        caption: post.caption ?? "",
        firstComment: post.first_comment,
        media,
        accessToken: account.access_token,
        pageId: account.page_id ?? account.account_id,
        validateOnly,
        idempotencyKey,
      });
    } else if (platform === "Instagram") {
      const connectedVia = String(account.provider_metadata?.connected_via ?? "");
      providerResult = await publishInstagramBusinessPost({
        caption: post.caption ?? "",
        firstComment: post.first_comment,
        media,
        accessToken: account.access_token,
        pageId: account.page_id,
        instagramBusinessAccountId:
          account.instagram_business_account_id ?? account.account_id,
        authSurface: connectedVia === "instagram_login" ? "instagram_login" : "facebook_login",
        validateOnly,
        idempotencyKey,
      });
    } else if (platform === "LinkedIn") {
      providerResult = await publishLinkedInMemberPost({
        caption: post.caption ?? "",
        firstComment: post.first_comment,
        media,
        accessToken: account.access_token,
        authorUrn: account.account_id,
        validateOnly,
        idempotencyKey,
      });
    } else {
      return {
        destinationAccountId: account.id,
        platform,
        destinationAccountName: accountName,
        status: "Skipped",
        message: `${platform} publishing support coming soon.`,
        finishedAt: new Date().toISOString(),
      };
    }

    return {
      destinationAccountId: account.id,
      platform,
      destinationAccountName: accountName,
      status: providerResult.ok ? "Succeeded" : "Failed",
      message: providerResult.message,
      providerPostId: providerResult.providerPostId ?? null,
      finishedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof PublishingException) {
      return {
        destinationAccountId: account.id,
        platform,
        destinationAccountName: accountName,
        status: "Failed",
        message: error.message,
        finishedAt: new Date().toISOString(),
      };
    }

    const errorMessage = error instanceof Error ? error.message : "Publishing failed";
    return {
      destinationAccountId: account.id,
      platform,
      destinationAccountName: accountName,
      status: "Failed",
      message: errorMessage,
      finishedAt: new Date().toISOString(),
    };
  }
}

export async function publishPost(
  client: SupabaseClient,
  options: PublishPostOptions,
): Promise<PublishPostResult> {
  const postQuery = client.from("posts").select("*").eq("id", options.postId);
  const { data: post, error: postError } = await (options.userId
    ? postQuery.eq("user_id", options.userId).single()
    : postQuery.single());

  if (postError || !post) {
    throw new Error("Post was not found or is not owned by the current user.");
  }

  const postRow = post as PostRow;
  const currentStatus = normalizePostStatus(postRow.status);

  if (isTerminalPostStatus(currentStatus)) {
    throw new Error("This post has already reached a terminal publishing state.");
  }

  const accountQuery = client
    .from("connected_accounts")
    .select("*")
    .eq("user_id", postRow.user_id);

  const selectedQuery = options.destinationAccountIds?.length
    ? accountQuery.in("id", options.destinationAccountIds)
    : accountQuery.in(
        "platform",
        (postRow.platforms ?? []).map((platform) => normalizePlatform(platform)),
      );

  const { data: accounts, error: accountError } = await selectedQuery;

  if (accountError) {
    throw new Error(accountError.message);
  }

  if (!accounts?.length) {
    throw new Error("No connected destinations are available for this post.");
  }

  // Refresh tokens before publishing
  const refreshedAccounts = await Promise.all(
    (accounts as AccountRow[]).map((account) => refreshAccountTokenIfNeeded(client, account)),
  );
  const media = await loadPostMedia(client, postRow);

  // Publish to all accounts in parallel
  const attempts = await Promise.all(
    refreshedAccounts.map((account) =>
      publishToAccount(postRow, account, Boolean(options.validateOnly), media),
    ),
  );

  const status = aggregateStatus(attempts);

  if (!options.validateOnly) {
    // Record all publishing attempts
    await Promise.all(
      attempts.map((attempt, index) =>
        insertAttempt(client, postRow, refreshedAccounts[index], attempt),
      ),
    );

    // Build failure summary
    const failureSummary =
      status === "Published"
        ? null
        : attempts
            .filter((attempt) => attempt.status !== "Succeeded")
            .map((attempt) => `${attempt.destinationAccountName}: ${attempt.message}`)
            .join("; ");

    // Extract external post ID from first successful attempt
    const externalPostId = attempts.find((attempt) => attempt.providerPostId)?.providerPostId ?? null;

    // Update post status with comprehensive metadata
    const { error: updateError } = await client
      .from("posts")
      .update({
        status,
        lifecycle_status:
          status === "Published" ? "published" : status === "Partially Published" ? "partial" : "failed",
        published_at: new Date().toISOString(),
        external_post_id: externalPostId,
        failure_summary: failureSummary,
        last_error_code: status === "Published" ? null : "publish_failed",
        last_error_message: failureSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postRow.id)
      .eq("user_id", postRow.user_id);

    // Gracefully handle missing columns on schema migration
    if (
      updateError &&
      /external_post_id|lifecycle_status|last_error_code|last_error_message|schema cache|does not exist/i.test(
        updateError.message,
      )
    ) {
      await client
        .from("posts")
        .update({
          status,
          published_at: new Date().toISOString(),
          failure_summary: failureSummary,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postRow.id)
        .eq("user_id", postRow.user_id);
    } else if (updateError) {
      throw new Error(updateError.message);
    }

    // Create activity event for audit trail
    await client
      .from("activity_events")
      .insert([
        {
          user_id: postRow.user_id,
          workspace_id: postRow.workspace_id ?? null,
          post_id: postRow.id,
          event_type: status === "Published" ? "post.published" : "post.publish_completed",
          message: status === "Published" ? "Post published" : `Post finished as ${status}`,
          severity: status === "Published" ? "success" : "warning",
          metadata: { attempts, status },
        },
      ])
      .then(() => undefined);

    // Log publish action to audit trail
    await writeAuditLog(client, {
      workspaceId: postRow.workspace_id,
      actorUserId: options.userId ?? postRow.user_id,
      action: "post.publish",
      entityType: "post",
      entityId: postRow.id,
      metadata: {
        status,
        successCount: attempts.filter((a) => a.status === "Succeeded").length,
        failureCount: attempts.filter((a) => a.status === "Failed").length,
        skipCount: attempts.filter((a) => a.status === "Skipped").length,
        attempts: attempts.length,
      },
    });
  }

  return {
    postId: postRow.id,
    status,
    attempts,
  };
}

export async function processDuePosts(
  client: SupabaseClient,
  limit: number,
  dryRun: boolean,
  userId?: string,
) {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const now = new Date().toISOString();
  let query = client
    .from("posts")
    .select("*")
    .eq("status", "Scheduled")
    .or(`scheduled_for.lte.${now},schedule_time.lte.${now}`)
    .limit(boundedLimit);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: posts, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const duePosts = (posts ?? []) as PostRow[];
  const nonTerminal = duePosts.filter(
    (post) => !isTerminalPostStatus(normalizePostStatus(post.status)),
  );

  if (!dryRun) {
    await enqueueDuePosts(client, nonTerminal);
  }

  const workerResult = await runWorker(client, {
    jobTypes: ["publish_post"],
    limit: boundedLimit,
    dryRun,
    userId,
    workerId: userId ? `user-scheduler:${userId}` : "cron-scheduler",
  });

  let published = 0;
  let partiallyPublished = 0;
  let failed = 0;

  if (!dryRun && nonTerminal.length > 0) {
    const { data: statuses } = await client
      .from("posts")
      .select("status")
      .in(
        "id",
        nonTerminal.map((post) => post.id),
      );

    for (const row of statuses ?? []) {
      if (row.status === "Published") published += 1;
      if (row.status === "Partially Published") partiallyPublished += 1;
      if (row.status === "Failed") failed += 1;
    }
  } else {
    failed = workerResult.failed + workerResult.deadLettered;
  }

  return {
    enqueued: nonTerminal.length,
    processed: workerResult.processed,
    published: dryRun ? workerResult.succeeded : published,
    partiallyPublished,
    failed,
    skipped: workerResult.skipped + (duePosts.length - nonTerminal.length),
    retried: workerResult.retried,
    deadLettered: workerResult.deadLettered,
    released: workerResult.released,
  };
}
