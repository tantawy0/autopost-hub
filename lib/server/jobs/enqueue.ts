import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  analyticsIngestIdempotencyKey,
  socialSyncIdempotencyKey,
  tokenRefreshIdempotencyKey,
} from "@/lib/server/jobs/idempotency";
import { enqueueBackgroundJob } from "@/lib/server/jobs/queue";

export async function enqueueAnalyticsIngestJob(
  client: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    platform: string;
    metricDate: string;
    impressions?: number;
    reach?: number;
    engagement?: number;
    clicks?: number;
  },
) {
  return enqueueBackgroundJob(client, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    jobType: "analytics_ingest",
    idempotencyKey: analyticsIngestIdempotencyKey(input.userId, input.platform, input.metricDate),
    payload: {
      workspaceId: input.workspaceId,
      platform: input.platform,
      metricDate: input.metricDate,
      impressions: input.impressions ?? 0,
      reach: input.reach ?? 0,
      engagement: input.engagement ?? 0,
      clicks: input.clicks ?? 0,
    },
  });
}

export async function enqueueTokenRefreshJob(
  client: SupabaseClient,
  input: {
    workspaceId?: string | null;
    userId: string;
    connectedAccountId: string;
    runAfter?: string;
  },
) {
  return enqueueBackgroundJob(client, {
    workspaceId: input.workspaceId ?? null,
    userId: input.userId,
    jobType: "token_refresh",
    idempotencyKey: tokenRefreshIdempotencyKey(input.connectedAccountId),
    payload: { connectedAccountId: input.connectedAccountId },
    runAfter: input.runAfter,
  });
}

export async function enqueueSocialSyncJob(
  client: SupabaseClient,
  input: {
    workspaceId?: string | null;
    userId: string;
    connectedAccountId: string;
    runAfter?: string;
  },
) {
  return enqueueBackgroundJob(client, {
    workspaceId: input.workspaceId ?? null,
    userId: input.userId,
    jobType: "social_sync",
    idempotencyKey: socialSyncIdempotencyKey(input.connectedAccountId),
    payload: { connectedAccountId: input.connectedAccountId },
    runAfter: input.runAfter,
  });
}
