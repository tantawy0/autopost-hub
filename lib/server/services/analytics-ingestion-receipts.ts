import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AnalyticsErrorCode, AnalyticsException } from "@/lib/server/analytics-errors";

export type IngestionKind =
  | "daily_platform"
  | "post_snapshot"
  | "growth_snapshot"
  | "hourly_rollup";

export async function claimIngestionReceipt(
  client: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    ingestionKind: IngestionKind;
    idempotencyKey: string;
    payloadHash: string;
    metadata?: Record<string, unknown>;
    allowDuplicate?: boolean;
  },
): Promise<{ duplicate: boolean; receiptId: string | null }> {
  const { data: existing } = await client
    .from("analytics_ingestion_receipts")
    .select("id")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing?.id) {
    if (input.allowDuplicate) {
      return { duplicate: true, receiptId: existing.id as string };
    }

    throw new AnalyticsException(
      AnalyticsErrorCode.DUPLICATE_INGESTION,
      "Analytics ingestion already recorded for this idempotency key.",
      {
        retryable: false,
        metadata: { idempotencyKey: input.idempotencyKey, ingestionKind: input.ingestionKind },
      },
    );
  }

  const { data, error } = await client
    .from("analytics_ingestion_receipts")
    .insert([
      {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        ingestion_kind: input.ingestionKind,
        idempotency_key: input.idempotencyKey,
        payload_hash: input.payloadHash,
        metadata: input.metadata ?? {},
      },
    ])
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      if (input.allowDuplicate) {
        const { data: receipt } = await client
          .from("analytics_ingestion_receipts")
          .select("id")
          .eq("idempotency_key", input.idempotencyKey)
          .maybeSingle();

        return { duplicate: true, receiptId: (receipt?.id as string) ?? null };
      }

      throw new AnalyticsException(
        AnalyticsErrorCode.DUPLICATE_INGESTION,
        "Analytics ingestion already recorded for this idempotency key.",
        { retryable: false, metadata: { idempotencyKey: input.idempotencyKey } },
      );
    }

    throw new AnalyticsException(AnalyticsErrorCode.INTERNAL_ERROR, error.message, { retryable: true });
  }

  return { duplicate: false, receiptId: data.id as string };
}
