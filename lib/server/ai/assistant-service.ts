import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildAssistantSuggestions } from "@/lib/ai-content";
import { AiErrorCode, AiProviderException } from "@/lib/server/ai/ai-errors";
import { logAiGeneration } from "@/lib/server/ai/generation-log";
import { getAiRuntimeConfig, validateModelForProvider } from "@/lib/server/ai/model-config";
import {
  formatPromptVersionRef,
  resolveActivePromptVersion,
} from "@/lib/server/ai/prompt-versions";
import { getAiProvider, resolvePrimaryAiProvider } from "@/lib/server/ai/providers/registry";
import { recordAiUsageEvent } from "@/lib/server/ai/usage-tracking";

export type AssistantSuggestionsInput = {
  workspaceId: string;
  userId: string;
  caption?: string;
  prompt?: string;
  postId?: string | null;
};

function parseSuggestions(text: string): string[] | null {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (Array.isArray(parsed)) {
      const suggestions = parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);

      if (suggestions.length > 0) {
        return suggestions;
      }
    }
  } catch {
    // Fall through to line parsing.
  }

  const lines = trimmed
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return lines.length > 0 ? lines : null;
}

export async function generateAssistantSuggestions(
  client: SupabaseClient,
  input: AssistantSuggestionsInput,
): Promise<string[]> {
  const config = getAiRuntimeConfig();
  const userPrompt = (input.prompt ?? input.caption ?? "").trim();
  const promptVersion = await resolveActivePromptVersion(client, "assistant_suggestions");
  const promptVersionRef = formatPromptVersionRef(promptVersion.promptKey, promptVersion.version);
  const model = validateModelForProvider(config.assistantModel, config.primaryProvider);
  const primaryProvider = resolvePrimaryAiProvider();
  const started = Date.now();

  let suggestions: string[] | null = null;
  let providerUsed = primaryProvider.name;
  let modelUsed = model;
  let usageEventId: string | null = null;
  let usedFallback = false;

  try {
    const completion = await primaryProvider.complete({
      provider: primaryProvider.name,
      model,
      promptVersion,
      generationType: "assistant_suggestions",
      timeoutMs: config.requestTimeoutMs,
      maxRetries: config.maxRetries,
      messages: [
        { role: "system", content: promptVersion.systemPrompt },
        {
          role: "user",
          content: userPrompt || "Provide three suggestions to improve this social post draft.",
        },
      ],
    });

    suggestions = parseSuggestions(completion.text);
    modelUsed = completion.model;
    usageEventId = await recordAiUsageEvent(client, {
      workspaceId: input.workspaceId,
      userId: input.userId,
      provider: completion.provider,
      model: completion.model,
      generationType: "assistant_suggestions",
      promptVersion: promptVersionRef,
      status: suggestions ? "succeeded" : "fallback",
      latencyMs: completion.latencyMs,
      promptTokens: completion.usage?.promptTokens,
      completionTokens: completion.usage?.completionTokens,
      totalTokens: completion.usage?.totalTokens,
      metadata: { usedFallback: !suggestions },
    });
  } catch (error) {
    const errorCode =
      error instanceof AiProviderException ? error.code : AiErrorCode.PROVIDER_UNAVAILABLE;

    usageEventId = await recordAiUsageEvent(client, {
      workspaceId: input.workspaceId,
      userId: input.userId,
      provider: primaryProvider.name,
      model,
      generationType: "assistant_suggestions",
      promptVersion: promptVersionRef,
      status: "failed",
      latencyMs: Date.now() - started,
      errorCode,
      metadata: {
        providerFailed: true,
      },
    });

    if (config.primaryProvider !== "heuristic") {
      usedFallback = true;
      providerUsed = "heuristic";
      const fallback = getAiProvider("heuristic");
      const fallbackCompletion = await fallback.complete({
        provider: "heuristic",
        model: "heuristic-v1",
        promptVersion,
        generationType: "assistant_suggestions",
        timeoutMs: config.requestTimeoutMs,
        maxRetries: 0,
        messages: [
          { role: "system", content: promptVersion.systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      suggestions = parseSuggestions(fallbackCompletion.text) ?? buildAssistantSuggestions(userPrompt);
      modelUsed = "heuristic-v1";

      await recordAiUsageEvent(client, {
        workspaceId: input.workspaceId,
        userId: input.userId,
        provider: "heuristic",
        model: modelUsed,
        generationType: "assistant_suggestions",
        promptVersion: promptVersionRef,
        status: "fallback",
        latencyMs: fallbackCompletion.latencyMs,
        metadata: { primaryErrorCode: errorCode },
      });
    } else {
      throw error;
    }
  }

  const finalSuggestions = suggestions ?? buildAssistantSuggestions(userPrompt);

  await logAiGeneration(client, {
    workspaceId: input.workspaceId,
    userId: input.userId,
    postId: input.postId,
    generationType: "assistant_suggestions",
    provider: providerUsed,
    model: modelUsed,
    promptVersion: promptVersionRef,
    usageEventId,
    inputPayload: {
      caption: input.caption ?? null,
      prompt: input.prompt ?? null,
      postId: input.postId ?? null,
    },
    outputPayload: { suggestions: finalSuggestions, usedFallback },
  });

  return finalSuggestions;
}
