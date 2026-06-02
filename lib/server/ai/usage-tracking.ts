import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiProviderName } from "@/lib/server/ai/model-config";

export type AiUsageStatus = "succeeded" | "failed" | "fallback";

export type RecordAiUsageInput = {
  workspaceId?: string | null;
  userId: string;
  provider: AiProviderName;
  model?: string | null;
  generationType: string;
  promptVersion?: string | null;
  status: AiUsageStatus;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  errorCode?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordAiUsageEvent(
  client: SupabaseClient,
  input: RecordAiUsageInput,
): Promise<string | null> {
  const { data, error } = await client
    .from("ai_usage_events")
    .insert([
      {
        workspace_id: input.workspaceId ?? null,
        user_id: input.userId,
        provider: input.provider,
        model: input.model ?? null,
        generation_type: input.generationType,
        prompt_version: input.promptVersion ?? null,
        status: input.status,
        latency_ms: input.latencyMs ?? null,
        prompt_tokens: input.promptTokens ?? null,
        completion_tokens: input.completionTokens ?? null,
        total_tokens: input.totalTokens ?? null,
        error_code: input.errorCode ?? null,
        metadata: input.metadata ?? {},
      },
    ])
    .select("id")
    .single();

  if (error) {
    return null;
  }

  return (data?.id as string) ?? null;
}
