import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { writeAuditLog } from "@/lib/server/audit";
import {
  AnalyticsErrorCode,
  AnalyticsException,
} from "@/lib/server/analytics-errors";
import { archiveStaleGrowthSnapshots, upsertGrowthSnapshot } from "@/lib/server/services/analytics-growth";
import {
  assertValidAnalyticsPlatform,
  assertValidMetricDate,
  buildMetricsPayloadHash,
  normalizePlatformMetrics,
} from "@/lib/server/services/analytics-metrics";
import { claimIngestionReceipt } from "@/lib/server/services/analytics-ingestion-receipts";
import { upsertDailyRollup, upsertHourlyRollup } from "@/lib/server/services/analytics-rollups";

export type AnalyticsIngestInput = {
  workspaceId: string;
  userId: string;
  platform: string;
  metricDate: string;
  impressions?: number;
  reach?: number;
  engagement?: number;
  clicks?: number;
  observedAt?: Date;
  skipGrowthSnapshot?: boolean;
  skipHourlyRollup?: boolean;
};

export type AnalyticsIngestResult = {
  ok: true;
  duplicate: boolean;
  metrics: {
    impressions: number;
    reach: number;
    engagement: number;
    clicks: number;
  };
  growthSnapshotId?: string;
};

function dailyIngestionIdempotencyKey(
  userId: string,
  platform: string,
  metricDate: string,
  payloadHash: string,
): string {
  return `daily:${userId}:${platform}:${metricDate}:${payloadHash}`;
}

export async function ingestAnalyticsMetrics(
  client: SupabaseClient,
  input: AnalyticsIngestInput,
): Promise<AnalyticsIngestResult> {
  assertValidAnalyticsPlatform(input.platform);
  assertValidMetricDate(input.metricDate);

  const metrics = normalizePlatformMetrics(input);
  const payloadHash = buildMetricsPayloadHash(metrics);
  const idempotencyKey = dailyIngestionIdempotencyKey(
    input.userId,
    input.platform,
    input.metricDate,
    payloadHash,
  );

  try {
    await claimIngestionReceipt(client, {
      workspaceId: input.workspaceId,
      userId: input.userId,
      ingestionKind: "daily_platform",
      idempotencyKey,
      payloadHash,
      metadata: { platform: input.platform, metricDate: input.metricDate },
      allowDuplicate: false,
    });
  } catch (error) {
    if (
      error instanceof AnalyticsException &&
      error.code === AnalyticsErrorCode.DUPLICATE_INGESTION
    ) {
      return { ok: true, duplicate: true, metrics };
    }

    throw error;
  }

  const { error } = await client.from("analytics_daily").upsert(
    [
      {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        platform: input.platform,
        metric_date: input.metricDate,
        ...metrics,
      },
    ],
    { onConflict: "user_id,platform,metric_date" },
  );

  if (error) {
    throw new AnalyticsException(AnalyticsErrorCode.INTERNAL_ERROR, error.message, { retryable: true });
  }

  await upsertDailyRollup(client, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    platform: input.platform,
    metricDate: input.metricDate,
    metrics,
  });

  if (!input.skipHourlyRollup) {
    await upsertHourlyRollup(client, {
      workspaceId: input.workspaceId,
      userId: input.userId,
      platform: input.platform,
      metricDate: input.metricDate,
      metrics,
      observedAt: input.observedAt,
    });
  }

  let growthSnapshotId: string | undefined;

  if (!input.skipGrowthSnapshot) {
    const growth = await upsertGrowthSnapshot(client, {
      workspaceId: input.workspaceId,
      userId: input.userId,
      platform: input.platform,
      periodGrain: "day",
      bucketKey: input.metricDate,
      metrics,
    });
    growthSnapshotId = growth.snapshotId;

    await archiveStaleGrowthSnapshots(client, { userId: input.userId }).catch(() => undefined);
  }

  await writeAuditLog(client, {
    workspaceId: input.workspaceId,
    actorUserId: input.userId,
    action: "analytics.ingested",
    entityType: "analytics_daily",
    metadata: {
      platform: input.platform,
      metricDate: input.metricDate,
      payloadHash,
      growthSnapshotId,
    },
  }).catch(() => undefined);

  return { ok: true, duplicate: false, metrics, growthSnapshotId };
}
