import { NextResponse, type NextRequest } from "next/server";

import { toSafeError } from "@/lib/auth";
import {
  assertConnectedAccountOwnedByUser,
  requireAuthenticatedUser,
  requireWorkspacePermission,
} from "@/lib/server/authorization";
import { enqueueSocialSyncJob } from "@/lib/server/jobs/enqueue";
import { ingestPostMetricSnapshots } from "@/lib/server/services/analytics-post-metrics";
import { refreshAccountTokenIfNeeded } from "@/lib/oauth-tokens";
import { getMetaGraphVersion } from "@/lib/providers/meta";
import { assertRateLimit, getRateLimitKey } from "@/lib/server/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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
  workspace_id?: string | null;
};

type GraphItem = Record<string, unknown> & { id: string };

function graphBase() {
  return `https://graph.facebook.com/${getMetaGraphVersion()}`;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summaryCount(value: unknown): number | null {
  const summary = (value as { summary?: { total_count?: unknown } } | null)?.summary;

  return numberValue(summary?.total_count);
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    throw new Error((body?.error as { message?: string } | undefined)?.message ?? "Unable to sync account posts.");
  }

  return body ?? {};
}

async function fetchAllPages(url: string, max = 250): Promise<GraphItem[]> {
  const items: GraphItem[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl && items.length < max) {
    const body = await fetchJson(nextUrl);
    items.push(...(((body.data as GraphItem[] | undefined) ?? []).filter((item) => item.id)));
    nextUrl = (body.paging as { next?: string } | undefined)?.next;
  }

  return items.slice(0, max);
}

async function fetchInsights(nodeId: string, token: string, metrics: string[]) {
  const values: Record<string, number> = {};
  const url = `${graphBase()}/${nodeId}/insights?metric=${metrics.join(",")}&access_token=${encodeURIComponent(token)}`;

  try {
    const body = await fetchJson(url);

    for (const item of (body.data as Array<{ name?: string; values?: Array<{ value?: unknown }> }> | undefined) ?? []) {
      const raw = item.values?.[0]?.value;
      const numeric: number | null = typeof raw === "object" && raw ? null : Number(raw);

      if (item.name && numeric !== null && Number.isFinite(numeric)) values[item.name] = numeric;
    }
  } catch {
    return values;
  }

  return values;
}

function firstAttachmentImage(post: Record<string, unknown>): string | null {
  const attachments = (post.attachments as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
  const first = attachments[0];
  const media = first?.media as { image?: { src?: string } } | undefined;
  const sub = (first?.subattachments as { data?: Array<{ media?: { image?: { src?: string } } }> } | undefined)?.data?.[0];

  return media?.image?.src ?? sub?.media?.image?.src ?? (post.full_picture as string | undefined) ?? null;
}

async function buildFacebookRows(account: AccountRow & { access_token: string }, userId: string) {
  const pageId = account.page_id ?? account.account_id;
  const fields = [
    "id",
    "message",
    "created_time",
    "permalink_url",
    "full_picture",
    "status_type",
    "attachments{media,type,subattachments}",
    "reactions.summary(total_count).limit(0)",
    "comments.summary(total_count).limit(0)",
    "shares",
  ].join(",");
  const posts = await fetchAllPages(
    `${graphBase()}/${pageId}/posts?fields=${fields}&limit=100&access_token=${encodeURIComponent(account.access_token)}`,
  );

  return Promise.all(posts.map(async (post) => {
    const insights = await fetchInsights(post.id, account.access_token, [
      "post_impressions",
      "post_impressions_unique",
      "post_video_views",
    ]);
    const reactions = summaryCount(post.reactions);
    const comments = summaryCount(post.comments);
    const views = insights.post_video_views ?? insights.post_impressions ?? null;
    const reach = insights.post_impressions_unique ?? null;
    const shares = numberValue((post.shares as { count?: unknown } | undefined)?.count);
    const engagementBase = reach || views || null;
    const engagementRate = engagementBase ? Number((((reactions ?? 0) + (comments ?? 0) + (shares ?? 0)) / engagementBase * 100).toFixed(2)) : null;

    return {
      user_id: userId,
      connected_account_id: account.id,
      platform: "Facebook",
      account_name: account.account_name,
      external_post_id: post.id,
      caption: (post.message as string | undefined) ?? null,
      media_type: (post.status_type as string | undefined) ?? null,
      media_url: firstAttachmentImage(post),
      permalink: (post.permalink_url as string | undefined) ?? null,
      timestamp: (post.created_time as string | undefined) ?? null,
      like_count: reactions,
      comments_count: comments,
      reactions_count: reactions,
      engagement_rate: engagementRate,
      views_count: views,
      shares_count: shares,
      saves_count: null,
      follows_count: null,
      reach_count: reach,
      raw_payload: { ...post, insights },
      updated_at: new Date().toISOString(),
    };
  }));
}

async function buildInstagramRows(account: AccountRow & { access_token: string }, userId: string) {
  const igUserId = account.instagram_business_account_id ?? account.account_id;
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";
  const posts = await fetchAllPages(
    `${graphBase()}/${igUserId}/media?fields=${fields}&limit=100&access_token=${encodeURIComponent(account.access_token)}`,
  );

  return Promise.all(posts.map(async (post) => {
    const insights = await fetchInsights(post.id, account.access_token, [
      "reach",
      "views",
      "saved",
      "shares",
      "follows",
      "total_interactions",
    ]);
    const reactions = numberValue(post.like_count);
    const comments = numberValue(post.comments_count);
    const views = insights.views ?? null;
    const reach = insights.reach ?? null;
    const shares = insights.shares ?? null;
    const saves = insights.saved ?? null;
    const follows = insights.follows ?? null;
    const engagementBase = reach || views || null;
    const engagementTotal = insights.total_interactions ?? ((reactions ?? 0) + (comments ?? 0) + (shares ?? 0) + (saves ?? 0));
    const engagementRate = engagementBase ? Number((engagementTotal / engagementBase * 100).toFixed(2)) : null;

    return {
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
      like_count: reactions,
      comments_count: comments,
      reactions_count: reactions,
      engagement_rate: engagementRate,
      views_count: views,
      shares_count: shares,
      saves_count: saves,
      follows_count: follows,
      reach_count: reach,
      raw_payload: { ...post, insights },
      updated_at: new Date().toISOString(),
    };
  }));
}

export async function POST(request: NextRequest) {
  try {
    const client = createServerSupabaseClient();
    const user = await requireAuthenticatedUser(client, request);
    await requireWorkspacePermission(client, user, "social_sync", {
      action: "social.sync_posts",
      entityType: "connected_account",
      request,
    });
    await assertRateLimit(client, {
      key: getRateLimitKey(request, user.id),
      action: "sync_social_posts",
      limit: 12,
      windowSeconds: 60,
    });
    const body = (await request.json().catch(() => ({}))) as { connectedAccountId?: string };

    if (!body.connectedAccountId) {
      return NextResponse.json({ message: "Connected account is required." }, { status: 400 });
    }

    await assertConnectedAccountOwnedByUser(client, user.id, body.connectedAccountId, request);

    if (request.nextUrl.searchParams.get("async") === "1") {
      const { data: accountMeta } = await client
        .from("connected_accounts")
        .select("workspace_id")
        .eq("id", body.connectedAccountId)
        .eq("user_id", user.id)
        .maybeSingle();

      const queued = await enqueueSocialSyncJob(client, {
        workspaceId: accountMeta?.workspace_id ?? null,
        userId: user.id,
        connectedAccountId: body.connectedAccountId,
      });

      return NextResponse.json({ queued });
    }

    const { data: account, error: accountError } = await client
      .from("connected_accounts")
      .select("id, workspace_id, platform, account_name, account_id, page_id, instagram_business_account_id, access_token, token_ciphertext, token_expires_at")
      .eq("id", body.connectedAccountId)
      .eq("user_id", user.id)
      .in("platform", ["Facebook", "Instagram"])
      .single();

    if (accountError || !account) {
      throw new Error("Account is not connected.");
    }

    const accountWithToken = await refreshAccountTokenIfNeeded(client, account as AccountRow);

    if (!accountWithToken.access_token) {
      throw new Error("Account OAuth token is missing or expired.");
    }

    const rows =
      accountWithToken.platform === "Facebook"
        ? await buildFacebookRows(accountWithToken as AccountRow & { access_token: string }, user.id)
        : await buildInstagramRows(accountWithToken as AccountRow & { access_token: string }, user.id);

    if (rows.length > 0) {
      const { error } = await client
        .from("social_posts")
        .upsert(
          rows.map((row) => ({ ...row, workspace_id: accountWithToken.workspace_id ?? null })) as never,
          { onConflict: "connected_account_id,external_post_id" },
        );

      if (error) throw new Error(error.message);

      if (accountWithToken.workspace_id) {
        await ingestPostMetricSnapshots(
          client,
          rows.map((row) => ({
            workspaceId: accountWithToken.workspace_id ?? null,
            userId: user.id,
            connectedAccountId: accountWithToken.id,
            platform: row.platform,
            externalPostId: row.external_post_id,
            source: "social_sync",
            metrics: {
              likes: row.like_count,
              comments: row.comments_count,
              reactions: row.reactions_count,
              engagementRate: row.engagement_rate,
              views: row.views_count,
              reach: row.reach_count,
              shares: row.shares_count,
              saves: row.saves_count,
            },
            rawPayload: row.raw_payload as Record<string, unknown>,
          })),
        );
      }
    }

    return NextResponse.json({ imported: rows.length });
  } catch (error) {
    const safe = toSafeError(error);

    return NextResponse.json(safe, { status: safe.status });
  }
}
