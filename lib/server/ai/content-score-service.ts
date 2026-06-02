import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { scoreContent, type ContentScoreResult } from "@/lib/content-scoring";
import { AiErrorCode, AiProviderException } from "@/lib/server/ai/ai-errors";
import { logAiGeneration } from "@/lib/server/ai/generation-log";
import { getAiRuntimeConfig, validateModelForProvider, type AiProviderName } from "@/lib/server/ai/model-config";
import {
  formatPromptVersionRef,
  resolveActivePromptVersion,
} from "@/lib/server/ai/prompt-versions";
import { resolvePrimaryAiProvider } from "@/lib/server/ai/providers/registry";
import { recordAiUsageEvent } from "@/lib/server/ai/usage-tracking";
import { ensureDefaultWorkspace } from "@/lib/workspaces";

function parseRecommendations(text: string): string[] | null {
  try {
    const parsed = JSON.parse(text.trim()) as unknown;

    if (Array.isArray(parsed)) {
      const recommendations = parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4);

      return recommendations.length > 0 ? recommendations : null;
    }
  } catch {
    // Fall through to line parsing.
  }

  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 4);

  return lines.length > 0 ? lines : null;
}

export async function scoreAndPersistContent(
  client: SupabaseClient,
  user: User,
  input: {
    postId?: string | null;
    caption: string;
    platform?: string | null;
  },
): Promise<ContentScoreResult> {
  const workspace = await ensureDefaultWorkspace(client, user);
  const promptVersion = await resolveActivePromptVersion(client, "content_score_review");
  const promptVersionRef = formatPromptVersionRef(promptVersion.promptKey, promptVersion.version);
  const started = Date.now();
  const config = getAiRuntimeConfig();
  const primaryProvider = resolvePrimaryAiProvider();
  const model = validateModelForProvider(config.assistantModel, config.primaryProvider);
  const baseScore = scoreContent({ caption: input.caption, platform: input.platform as never });
  let score = baseScore;
  let providerUsed: AiProviderName = "heuristic";
  let modelUsed: string = baseScore.scoringVersion;
  let status: "succeeded" | "failed" | "fallback" = "succeeded";
  let errorCode: string | null = null;

  if (config.primaryProvider !== "heuristic") {
    try {
      const completion = await primaryProvider.complete({
        provider: primaryProvider.name,
        model,
        promptVersion,
        generationType: "content_score",
        timeoutMs: config.requestTimeoutMs,
        maxRetries: config.maxRetries,
        messages: [
          { role: "system", content: `${promptVersion.systemPrompt} Return ONLY a JSON array of 3-4 concise recommendation strings.` },
          { role: "user", content: `Platform: ${input.platform ?? "unknown"}\nCaption: ${input.caption}` },
        ],
      });
      const recommendations = parseRecommendations(completion.text);

      if (recommendations) {
        score = { ...baseScore, recommendations };
        providerUsed = completion.provider;
        modelUsed = completion.model;
      }
    } catch (error) {
      status = "fallback";
      errorCode = error instanceof AiProviderException ? error.code : AiErrorCode.PROVIDER_UNAVAILABLE;
      providerUsed = "heuristic";
      modelUsed = baseScore.scoringVersion;
    }
  }

  const usageEventId = await recordAiUsageEvent(client, {
    workspaceId: workspace.workspaceId,
    userId: user.id,
    provider: providerUsed,
    model: modelUsed,
    generationType: "content_score",
    promptVersion: promptVersionRef,
    status,
    latencyMs: Date.now() - started,
    errorCode,
    metadata: { platform: input.platform ?? null, fallbackProvider: status === "fallback" ? "heuristic" : null },
  });

  await client
    .from("content_scores")
    .insert([
      {
        workspace_id: workspace.workspaceId,
        user_id: user.id,
        post_id: input.postId ?? null,
        caption: input.caption,
        platform: input.platform ?? null,
        viral_score: score.viralScore,
        clarity_score: score.clarityScore,
        hook_score: score.hookScore,
        recommendations: score.recommendations,
        scoring_version: score.scoringVersion,
      },
    ])
    .then(() => undefined);

  await logAiGeneration(client, {
    workspaceId: workspace.workspaceId,
    userId: user.id,
    postId: input.postId,
    generationType: "content_score",
    provider: providerUsed,
    model: modelUsed,
    promptVersion: promptVersionRef,
    usageEventId,
    inputPayload: {
      caption: input.caption,
      platform: input.platform ?? null,
      postId: input.postId ?? null,
    },
    outputPayload: score as unknown as Record<string, unknown>,
  });

  return score;
}
