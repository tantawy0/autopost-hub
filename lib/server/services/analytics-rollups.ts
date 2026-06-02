import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AnalyticsErrorCode, AnalyticsException } from "@/lib/server/analytics-errors";
import type { NormalizedPlatformMetrics } from "@/lib/server/services/analytics-metrics";
import { buildMetricsPayloadHash } from "@/lib/server/services/analytics-metrics";
import { claimIngestionReceipt } from "@/lib/server/services/analytics-ingestion-receipts";

export type RollupGrain = "hour" | "day" | "week" | "month";

function dayBucket(metricDate: string): string {
  return metricDate;
}

function hourBucket(metricDate: string, at = new Date()): string {
  const hour = String(at.getUTCHours()).padStart(2, "0");
  return `${metricDate}T${hour}`;
}

export async function upsertDailyRollup(
  client: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    platform: string;
    metricDate: string;
    metrics: NormalizedPlatformMetrics;
  },
): Promise<void> {
  const bucketKey = dayBucket(input.metricDate);
  const idempotencyKey = `rollup:day:${input.workspaceId}:${input.platform}:${bucketKey}`;

  await claimIngestionReceipt(client, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    ingestionKind: "daily_platform",
    idempotencyKey: `${idempotencyKey}:rollup`,
    payloadHash: buildMetricsPayloadHash(input.metrics),
    metadata: { grain: "day", bucketKey },
    allowDuplicate: true,
  });

  const { error } = await client.from("analytics_rollups").upsert(
    [
      {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        platform: input.platform,
        grain: "day",
        period_start: input.metricDate,
        bucket_key: bucketKey,
        metrics: input.metrics,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "workspace_id,platform,grain,period_start" },
  );

  if (error) {
    throw new AnalyticsException(AnalyticsErrorCode.INTERNAL_ERROR, error.message, { retryable: true });
  }
}

export async function upsertHourlyRollup(
  client: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    platform: string;
    metricDate: string;
    metrics: NormalizedPlatformMetrics;
    observedAt?: Date;
  },
): Promise<void> {
  const observedAt = input.observedAt ?? new Date();
  const bucketKey = hourBucket(input.metricDate, observedAt);
  const periodStart = input.metricDate;
  const idempotencyKey = `rollup:hour:${input.workspaceId}:${input.platform}:${bucketKey}`;

  await claimIngestionReceipt(client, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    ingestionKind: "hourly_rollup",
    idempotencyKey,
    payloadHash: buildMetricsPayloadHash({ ...input.metrics, bucketKey }),
    metadata: { grain: "hour", bucketKey },
    allowDuplicate: true,
  });

  const { error } = await client.from("analytics_rollups").upsert(
    [
      {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        platform: input.platform,
        grain: "hour",
        period_start: periodStart,
        bucket_key: bucketKey,
        metrics: {
          ...input.metrics,
          hourUtc: observedAt.getUTCHours(),
          bucketKey,
        },
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "workspace_id,platform,grain,bucket_key" },
  );

  if (error) {
    throw new AnalyticsException(AnalyticsErrorCode.INTERNAL_ERROR, error.message, { retryable: true });
  }
}
