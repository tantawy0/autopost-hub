import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AnalyticsErrorCode, AnalyticsException } from "@/lib/server/analytics-errors";
import {
  buildMetricsPayloadHash,
  normalizePostMetricSnapshot,
  type PostMetricSnapshotInput,
} from "@/lib/server/services/analytics-metrics";
import { claimIngestionReceipt } from "@/lib/server/services/analytics-ingestion-receipts";

export function postMetricSnapshotIdempotencyKey(
  connectedAccountId: string,
  externalPostId: string,
  metricAt: string,
  source: string,
): string {
  return `post-snapshot:${connectedAccountId}:${externalPostId}:${metricAt}:${source}`;
}

async function supersedeActivePostSnapshots(
  client: SupabaseClient,
  input: {
    socialPostId: string;
    supersededBefore: string;
  },
): Promise<void> {
  const now = new Date().toISOString();

  await client
    .from("social_post_metric_snapshots")
    .update({
      lifecycle_status: "superseded",
      superseded_at: now,
    })
    .eq("social_post_id", input.socialPostId)
    .eq("lifecycle_status", "active")
    .lt("metric_at", input.supersededBefore)
    .then(() => undefined);
}

export type IngestPostMetricSnapshotInput = {
  workspaceId: string | null;
  userId: string;
  connectedAccountId: string;
  platform: string;
  externalPostId: string;
  socialPostId?: string | null;
  source?: string;
  metricAt?: string;
  metrics: PostMetricSnapshotInput;
  rawPayload?: Record<string, unknown>;
};

export async function ingestPostMetricSnapshot(
  client: SupabaseClient,
  input: IngestPostMetricSnapshotInput,
): Promise<{ inserted: boolean; duplicate: boolean; snapshotId: string | null }> {
  const metricAt = input.metricAt ?? new Date().toISOString();
  const source = input.source ?? "sync";
  const normalizedMetrics = normalizePostMetricSnapshot(input.metrics);
  const idempotencyKey = postMetricSnapshotIdempotencyKey(
    input.connectedAccountId,
    input.externalPostId,
    metricAt,
    source,
  );

  let socialPostId = input.socialPostId ?? null;

  if (!socialPostId) {
    const { data: socialPost } = await client
      .from("social_posts")
      .select("id")
      .eq("connected_account_id", input.connectedAccountId)
      .eq("external_post_id", input.externalPostId)
      .maybeSingle();

    socialPostId = (socialPost?.id as string | undefined) ?? null;
  }

  if (!input.workspaceId) {
    throw new AnalyticsException(
      AnalyticsErrorCode.WORKSPACE_REQUIRED,
      "workspaceId is required for post metric ingestion.",
      { retryable: false },
    );
  }

  const receipt = await claimIngestionReceipt(client, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    ingestionKind: "post_snapshot",
    idempotencyKey,
    payloadHash: buildMetricsPayloadHash(normalizedMetrics),
    metadata: {
      connectedAccountId: input.connectedAccountId,
      externalPostId: input.externalPostId,
      source,
    },
    allowDuplicate: true,
  });

  if (receipt.duplicate) {
    const { data: existing } = await client
      .from("social_post_metric_snapshots")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    return {
      inserted: false,
      duplicate: true,
      snapshotId: (existing?.id as string) ?? null,
    };
  }

  if (socialPostId) {
    await supersedeActivePostSnapshots(client, {
      socialPostId,
      supersededBefore: metricAt,
    });
  }

  const { data, error } = await client
    .from("social_post_metric_snapshots")
    .insert([
      {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        social_post_id: socialPostId,
        connected_account_id: input.connectedAccountId,
        platform: input.platform,
        metric_at: metricAt,
        metrics: normalizedMetrics,
        raw_payload: input.rawPayload ?? {},
        idempotency_key: idempotencyKey,
        source,
        lifecycle_status: "active",
      },
    ])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await client
        .from("social_post_metric_snapshots")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      return {
        inserted: false,
        duplicate: true,
        snapshotId: (existing?.id as string) ?? null,
      };
    }

    throw new AnalyticsException(AnalyticsErrorCode.INTERNAL_ERROR, error.message, { retryable: true });
  }

  return { inserted: true, duplicate: false, snapshotId: data.id as string };
}

export async function ingestPostMetricSnapshots(
  client: SupabaseClient,
  snapshots: IngestPostMetricSnapshotInput[],
): Promise<{ inserted: number; duplicates: number }> {
  let inserted = 0;
  let duplicates = 0;

  for (const snapshot of snapshots) {
    const result = await ingestPostMetricSnapshot(client, snapshot);
    if (result.duplicate) duplicates += 1;
    if (result.inserted) inserted += 1;
  }

  return { inserted, duplicates };
}
