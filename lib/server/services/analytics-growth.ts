import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AnalyticsErrorCode, AnalyticsException } from "@/lib/server/analytics-errors";
import type { NormalizedPlatformMetrics } from "@/lib/server/services/analytics-metrics";
import { buildMetricsPayloadHash } from "@/lib/server/services/analytics-metrics";
import { claimIngestionReceipt } from "@/lib/server/services/analytics-ingestion-receipts";

export type GrowthSnapshotLifecycle = "active" | "superseded" | "archived";

export function growthSnapshotIdempotencyKey(
  workspaceId: string,
  platform: string,
  periodGrain: "hour" | "day",
  bucketKey: string,
): string {
  return `growth:${workspaceId}:${platform}:${periodGrain}:${bucketKey}`;
}

async function supersedeActiveGrowthSnapshots(
  client: SupabaseClient,
  input: {
    userId: string;
    platform: string;
    periodGrain: "hour" | "day";
    bucketKey: string;
  },
): Promise<void> {
  const now = new Date().toISOString();

  await client
    .from("analytics_growth_snapshots")
    .update({
      lifecycle_status: "superseded",
      superseded_at: now,
      updated_at: now,
    })
    .eq("user_id", input.userId)
    .eq("platform", input.platform)
    .eq("period_grain", input.periodGrain)
    .eq("bucket_key", input.bucketKey)
    .eq("lifecycle_status", "active")
    .then(() => undefined);
}

export async function upsertGrowthSnapshot(
  client: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    platform: string;
    periodGrain: "hour" | "day";
    bucketKey: string;
    metrics: NormalizedPlatformMetrics;
    snapshotAt?: string;
  },
): Promise<{ snapshotId: string; lifecycleStatus: GrowthSnapshotLifecycle }> {
  const idempotencyKey = growthSnapshotIdempotencyKey(
    input.workspaceId,
    input.platform,
    input.periodGrain,
    input.bucketKey,
  );

  const receipt = await claimIngestionReceipt(client, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    ingestionKind: "growth_snapshot",
    idempotencyKey,
    payloadHash: buildMetricsPayloadHash(input.metrics),
    metadata: { periodGrain: input.periodGrain, bucketKey: input.bucketKey },
    allowDuplicate: true,
  });

  if (receipt.duplicate) {
    const { data: existing } = await client
      .from("analytics_growth_snapshots")
      .select("id, lifecycle_status")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing?.id) {
      return {
        snapshotId: existing.id as string,
        lifecycleStatus: (existing.lifecycle_status as GrowthSnapshotLifecycle) ?? "active",
      };
    }
  }

  await supersedeActiveGrowthSnapshots(client, {
    userId: input.userId,
    platform: input.platform,
    periodGrain: input.periodGrain,
    bucketKey: input.bucketKey,
  });

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("analytics_growth_snapshots")
    .upsert(
      [
        {
          workspace_id: input.workspaceId,
          user_id: input.userId,
          platform: input.platform,
          period_grain: input.periodGrain,
          bucket_key: input.bucketKey,
          snapshot_at: input.snapshotAt ?? now,
          metrics: input.metrics,
          lifecycle_status: "active",
          idempotency_key: idempotencyKey,
          superseded_at: null,
          archived_at: null,
          updated_at: now,
        },
      ],
      { onConflict: "idempotency_key" },
    )
    .select("id, lifecycle_status")
    .single();

  if (error) {
    throw new AnalyticsException(AnalyticsErrorCode.INTERNAL_ERROR, error.message, { retryable: true });
  }

  return {
    snapshotId: data.id as string,
    lifecycleStatus: (data.lifecycle_status as GrowthSnapshotLifecycle) ?? "active",
  };
}

export async function archiveStaleGrowthSnapshots(
  client: SupabaseClient,
  input: {
    userId: string;
    olderThanDays?: number;
  },
): Promise<number> {
  const days = input.olderThanDays ?? 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from("analytics_growth_snapshots")
    .update({
      lifecycle_status: "archived",
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", input.userId)
    .eq("lifecycle_status", "superseded")
    .lt("superseded_at", cutoff)
    .select("id");

  if (error) {
    throw new AnalyticsException(AnalyticsErrorCode.INTERNAL_ERROR, error.message, { retryable: true });
  }

  return (data ?? []).length;
}
