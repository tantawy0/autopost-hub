import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { refreshAccountTokenIfNeeded } from "@/lib/oauth-tokens";
import { getMetaGraphVersion } from "@/lib/providers/meta";
import { getInstagramApiVersion } from "@/lib/providers/instagram-login";
import type { JobHandlerResult } from "@/lib/server/jobs/handlers/result";
import type { BackgroundJobRow } from "@/lib/server/jobs/types";
import { ingestPostMetricSnapshots } from "@/lib/server/services/analytics-post-metrics";

type AccountRow = {
  id: string;
  platform: "Facebook" | "Instagram" | "TikTok";
  account_name: string;
  account_id: string;
  page_id?: string | null;
  instagram_business_account_id?: string | null;
  access_token?: string | null;
  token_ciphertext?: string | null;
  token_expires_at?: string | null;
  provider_metadata?: Record<string, unknown> | null;
  workspace_id?: string | null;
  user_id?: string;
};

type GraphItem = Record<string, unknown> & { id: string };

function graphBase() {
  return `https://graph.facebook.com/${getMetaGraphVersion()}`;
}

function instagramGraphBase(account: AccountRow) {
  return account.provider_metadata?.connected_via === "instagram_login"
    ? `https://graph.instagram.com/${getInstagramApiVersion()}`
    : graphBase();
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    throw new Error((body?.error as { message?: string } | undefined)?.message ?? "Unable to sync account posts.");
  }

  return body ?? {};
}

async function fetchAllPages(url: string, max = 50): Promise<GraphItem[]> {
  const items: GraphItem[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl && items.length < max) {
    const body = await fetchJson(nextUrl);
    items.push(...(((body.data as GraphItem[] | undefined) ?? []).filter((item) => item.id)));
    nextUrl = (body.paging as { next?: string } | undefined)?.next;
  }

  return items.slice(0, max);
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summaryCount(value: unknown): number | null {
  const summary = (value as { summary?: { total_count?: unknown } } | null)?.summary;

  return numberValue(summary?.total_count);
}

function firstAttachmentImage(post: Record<string, unknown>): string | null {
  const attachments = (post.attachments as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
  const first = attachments[0];
  const media = first?.media as { image?: { src?: string } } | undefined;

  return media?.image?.src ?? (post.full_picture as string | undefined) ?? null;
}

async function buildFacebookRows(account: AccountRow & { access_token: string }, userId: string) {
  const pageId = account.page_id ?? account.account_id;
  const fields = [
    "id",
    "message",
    "created_time",
    "permalink_url",
    "full_picture",
    "reactions.summary(total_count).limit(0)",
    "comments.summary(total_count).limit(0)",
  ].join(",");
  const posts = await fetchAllPages(
    `${graphBase()}/${pageId}/posts?fields=${fields}&limit=50&access_token=${encodeURIComponent(account.access_token)}`,
  );

  return posts.map((post) => {
    const reactions = summaryCount(post.reactions);
    const comments = summaryCount(post.comments);

    return {
      user_id: userId,
      connected_account_id: account.id,
      platform: "Facebook",
      account_name: account.account_name,
      external_post_id: post.id,
      caption: (post.message as string | undefined) ?? null,
      media_url: firstAttachmentImage(post),
      permalink: (post.permalink_url as string | undefined) ?? null,
      timestamp: (post.created_time as string | undefined) ?? null,
      like_count: reactions,
      comments_count: comments,
      reactions_count: reactions,
      raw_payload: post,
      updated_at: new Date().toISOString(),
    };
  });
}

async function buildInstagramRows(account: AccountRow & { access_token: string }, userId: string) {
  const igUserId = account.instagram_business_account_id ?? account.account_id;
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const posts = await fetchAllPages(
    `${instagramGraphBase(account)}/${igUserId}/media?fields=${fields}&limit=50&access_token=${encodeURIComponent(account.access_token)}`,
  );

  return posts.map((post) => ({
    user_id: userId,
    connected_account_id: account.id,
    platform: "Instagram",
    account_name: account.account_name,
    external_post_id: post.id,
    caption: (post.caption as string | undefined) ?? null,
    media_type: (post.media_type as string | undefined) ?? null,
    media_url: (post.media_url as string | undefined) ?? (post.thumbnail_url as string | undefined) ?? null,
    permalink: (post.permalink as string | undefined) ?? null,
    timestamp: (post.timestamp as string | undefined) ?? null,
    like_count: numberValue(post.like_count),
    comments_count: numberValue(post.comments_count),
    reactions_count: numberValue(post.like_count),
    raw_payload: post,
    updated_at: new Date().toISOString(),
  }));
}

export async function runSocialSyncJob(
  client: SupabaseClient,
  job: BackgroundJobRow,
): Promise<JobHandlerResult> {
  const connectedAccountId =
    typeof job.payload.connectedAccountId === "string" ? job.payload.connectedAccountId : null;

  if (!connectedAccountId) {
    return {
      success: false,
      errorCode: "INVALID_CONTENT",
      errorMessage: "social_sync job missing connectedAccountId.",
    };
  }

  const { data: account, error: accountError } = await client
    .from("connected_accounts")
    .select(
      "id, user_id, workspace_id, platform, account_name, account_id, page_id, instagram_business_account_id, access_token, token_ciphertext, token_expires_at, provider_metadata",
    )
    .eq("id", connectedAccountId)
    .eq("user_id", job.user_id)
    .in("platform", ["Facebook", "Instagram"])
    .single();

  if (accountError || !account) {
    return {
      success: false,
      errorCode: "ACCOUNT_DISCONNECTED",
      errorMessage: "Account is not connected.",
    };
  }

  const accountWithToken = await refreshAccountTokenIfNeeded(client, account as AccountRow);

  if (!accountWithToken.access_token) {
    return {
      success: false,
      errorCode: "TOKEN_EXPIRED",
      errorMessage: "Account OAuth token is missing or expired.",
    };
  }

  const rows =
    accountWithToken.platform === "Facebook"
      ? await buildFacebookRows(accountWithToken as AccountRow & { access_token: string }, job.user_id)
      : await buildInstagramRows(accountWithToken as AccountRow & { access_token: string }, job.user_id);

  if (rows.length > 0) {
    const { error } = await client
      .from("social_posts")
      .upsert(
        rows.map((row) => ({ ...row, workspace_id: accountWithToken.workspace_id ?? null })) as never,
        { onConflict: "connected_account_id,external_post_id" },
      );

    if (error) {
      return {
        success: false,
        errorCode: "worker_failed",
        errorMessage: error.message,
      };
    }

    if (accountWithToken.workspace_id) {
      const snapshotResult = await ingestPostMetricSnapshots(
        client,
        rows.map((row) => ({
          workspaceId: accountWithToken.workspace_id ?? null,
          userId: job.user_id,
          connectedAccountId: accountWithToken.id,
          platform: row.platform,
          externalPostId: row.external_post_id,
          source: "social_sync_worker",
          metrics: {
            likes: row.like_count,
            comments: row.comments_count,
            reactions: row.reactions_count,
            engagementRate:
              "engagement_rate" in row ? (row.engagement_rate as number | null) : null,
            views: "views_count" in row ? (row.views_count as number | null) : null,
            reach: "reach_count" in row ? (row.reach_count as number | null) : null,
            shares: "shares_count" in row ? (row.shares_count as number | null) : null,
            saves: "saves_count" in row ? (row.saves_count as number | null) : null,
          },
          rawPayload: row.raw_payload as Record<string, unknown>,
        })),
      );

      return {
        success: true,
        metadata: {
          imported: rows.length,
          connectedAccountId,
          snapshotsInserted: snapshotResult.inserted,
          snapshotsDuplicate: snapshotResult.duplicates,
        },
      };
    }
  }

  return {
    success: true,
    metadata: { imported: rows.length, connectedAccountId },
  };
}
