import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiProviderName } from "@/lib/server/ai/model-config";

export async function logAiGeneration(
  client: SupabaseClient,
  input: {
    workspaceId?: string | null;
    userId: string;
    postId?: string | null;
    generationType: string;
    provider: AiProviderName;
    model: string;
    promptVersion?: string | null;
    usageEventId?: string | null;
    inputPayload: Record<string, unknown>;
    outputPayload: Record<string, unknown>;
  },
): Promise<void> {
  await client
    .from("ai_generations")
    .insert([
      {
        workspace_id: input.workspaceId ?? null,
        user_id: input.userId,
        post_id: input.postId ?? null,
        generation_type: input.generationType,
        input: input.inputPayload,
        output: input.outputPayload,
        provider: input.provider,
        model: input.model,
        prompt_version: input.promptVersion ?? null,
        usage_event_id: input.usageEventId ?? null,
      },
    ])
    .then(() => undefined);
}
