import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { AiErrorCode, AiProviderException } from "@/lib/server/ai/ai-errors";

export type PromptVersionRecord = {
  promptKey: string;
  version: string;
  systemPrompt: string;
  metadata: Record<string, unknown>;
};

const FALLBACK_PROMPTS: Record<string, PromptVersionRecord> = {
  assistant_suggestions: {
    promptKey: "assistant_suggestions",
    version: "1.0.0",
    systemPrompt:
      "You are AutoPost Hub's creator growth assistant. Return ONLY a JSON array of exactly 3 concise, actionable suggestion strings. No markdown, no prose outside the JSON array.",
    metadata: { output: "string[]", maxItems: 3 },
  },
  content_score_review: {
    promptKey: "content_score_review",
    version: "1.0.0",
    systemPrompt:
      "You review short-form social captions for hook strength, clarity, and engagement potential.",
    metadata: { output: "heuristic_score" },
  },
};

export function formatPromptVersionRef(promptKey: string, version: string): string {
  return `${promptKey}@${version}`;
}

export async function resolveActivePromptVersion(
  client: SupabaseClient | null,
  promptKey: string,
): Promise<PromptVersionRecord> {
  if (client) {
    const { data } = await client
      .from("ai_prompt_versions")
      .select("prompt_key, version, system_prompt, metadata")
      .eq("prompt_key", promptKey)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.prompt_key && data.version && data.system_prompt) {
      return {
        promptKey: data.prompt_key as string,
        version: data.version as string,
        systemPrompt: data.system_prompt as string,
        metadata: (data.metadata as Record<string, unknown>) ?? {},
      };
    }
  }

  const fallback = FALLBACK_PROMPTS[promptKey];

  if (!fallback) {
    throw new AiProviderException(AiErrorCode.INVALID_PROMPT, `Unknown prompt key: ${promptKey}`, {
      retryable: false,
    });
  }

  return fallback;
}
