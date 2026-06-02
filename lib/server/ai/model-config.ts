import "server-only";

import { AiErrorCode, AiProviderException } from "@/lib/server/ai/ai-errors";

export type AiProviderName = "openrouter" | "gemini" | "heuristic" | "21st";

const OPENROUTER_ALLOWED_MODELS = new Set([
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "anthropic/claude-3.5-haiku",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
  "google/gemini-2.5-pro-preview",
  "google/gemini-2.5-pro",
  "meta-llama/llama-3.1-8b-instruct",
]);

const GEMINI_ALLOWED_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
]);

export type AiRuntimeConfig = {
  primaryProvider: AiProviderName;
  openRouterApiKey: string | null;
  openRouterBaseUrl: string;
  geminiApiKey: string | null;
  geminiModel: string;
  assistantModel: string;
  requestTimeoutMs: number;
  maxRetries: number;
};

export function getAiRuntimeConfig(): AiRuntimeConfig {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim() || null;
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || null;
  const forcedProvider = process.env.AI_PRIMARY_PROVIDER?.trim() as AiProviderName | undefined;
  const primaryProvider: AiProviderName =
    forcedProvider === "openrouter" || forcedProvider === "gemini" || forcedProvider === "heuristic"
      ? forcedProvider
      : "heuristic";

  return {
    primaryProvider,
    openRouterApiKey,
    openRouterBaseUrl: process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1",
    geminiApiKey,
    geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash",
    assistantModel:
      process.env.AI_MODEL_ASSISTANT?.trim() ||
      (primaryProvider === "gemini"
        ? process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash"
        : primaryProvider === "openrouter"
          ? "openai/gpt-4o-mini"
          : "heuristic-v1"),
    requestTimeoutMs: Math.max(1000, Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30_000)),
    maxRetries: Math.max(0, Math.min(5, Number(process.env.AI_MAX_RETRIES ?? 2))),
  };
}

export function validateModelForProvider(model: string, provider: AiProviderName): string {
  const normalized = model.trim();

  if (!normalized) {
    throw new AiProviderException(AiErrorCode.INVALID_MODEL, "Model id is required.", {
      retryable: false,
    });
  }

  if (provider === "heuristic") {
    return normalized;
  }

  if (provider === "openrouter" && !OPENROUTER_ALLOWED_MODELS.has(normalized)) {
    throw new AiProviderException(
      AiErrorCode.INVALID_MODEL,
      `Model ${normalized} is not in the OpenRouter allowlist.`,
      { retryable: false, metadata: { model: normalized, provider } },
    );
  }

  if (provider === "gemini" && !GEMINI_ALLOWED_MODELS.has(normalized)) {
    throw new AiProviderException(
      AiErrorCode.INVALID_MODEL,
      `Model ${normalized} is not in the Gemini allowlist.`,
      { retryable: false, metadata: { model: normalized, provider } },
    );
  }

  return normalized;
}

export function isAiProviderConfigured(provider: AiProviderName): boolean {
  if (provider === "openrouter") {
    return Boolean(process.env.OPENROUTER_API_KEY?.trim());
  }

  if (provider === "gemini") {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  }

  if (provider === "21st") {
    return Boolean(process.env.API_KEY_21ST?.trim());
  }

  return true;
}
