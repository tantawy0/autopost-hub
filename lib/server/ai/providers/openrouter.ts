import "server-only";

import { AiErrorCode, AiProviderException } from "@/lib/server/ai/ai-errors";
import { getAiRuntimeConfig, validateModelForProvider } from "@/lib/server/ai/model-config";
import type { AiCompletionInput, AiCompletionResult, AiProviderAdapter } from "@/lib/server/ai/providers/types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapHttpError(status: number, message: string): AiProviderException {
  if (status === 401 || status === 403) {
    return new AiProviderException(AiErrorCode.PROVIDER_AUTH_FAILED, message, {
      retryable: false,
      metadata: { status },
    });
  }

  if (status === 429) {
    return new AiProviderException(AiErrorCode.PROVIDER_RATE_LIMIT, message, {
      retryable: true,
      metadata: { status },
    });
  }

  if (status === 408) {
    return new AiProviderException(AiErrorCode.PROVIDER_TIMEOUT, message, {
      retryable: true,
      metadata: { status },
    });
  }

  if (status >= 500) {
    return new AiProviderException(AiErrorCode.PROVIDER_UNAVAILABLE, message, {
      retryable: true,
      metadata: { status },
    });
  }

  return new AiProviderException(AiErrorCode.INVALID_RESPONSE, message, {
    retryable: false,
    metadata: { status },
  });
}

const OPENROUTER_MODEL_FALLBACKS: Record<string, string[]> = {
  "google/gemini-2.5-pro-preview": ["google/gemini-2.5-pro"],
};

function getModelCandidates(model: string): string[] {
  return [model, ...(OPENROUTER_MODEL_FALLBACKS[model] ?? [])];
}

function shouldTryFallbackModel(error: unknown): boolean {
  if (!(error instanceof AiProviderException)) {
    return false;
  }

  const status = Number(error.metadata?.status ?? 0);
  const message = error.message.toLowerCase();

  if (error.code === AiErrorCode.PROVIDER_AUTH_FAILED || error.code === AiErrorCode.PROVIDER_RATE_LIMIT) {
    return false;
  }

  if (/credit|payment|balance|quota|billing/.test(message)) {
    return false;
  }

  return (
    status === 400 &&
    /model|endpoint|not found|not available|unavailable|preview|no endpoints/.test(message)
  );
}

async function callOpenRouter(
  input: AiCompletionInput,
  model: string,
): Promise<AiCompletionResult> {
  const config = getAiRuntimeConfig();

  if (!config.openRouterApiKey) {
    throw new AiProviderException(
      AiErrorCode.CONFIGURATION_ERROR,
      "OPENROUTER_API_KEY is not configured.",
      { retryable: false },
    );
  }

  const started = Date.now();
  const response = await fetch(`${config.openRouterBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://autopost-hub.local",
      "X-Title": "AutoPost Hub",
    },
    body: JSON.stringify({
      model,
      messages: input.messages,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(input.timeoutMs),
  });

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const message =
      (body?.error as { message?: string } | undefined)?.message ??
      `OpenRouter request failed with status ${response.status}.`;
    throw mapHttpError(response.status, message);
  }

  const choice = (body?.choices as Array<{ message?: { content?: string } }> | undefined)?.[0];
  const text = choice?.message?.content?.trim();

  if (!text) {
    throw new AiProviderException(AiErrorCode.INVALID_RESPONSE, "OpenRouter returned an empty completion.", {
      retryable: false,
    });
  }

  const usage = body?.usage as
    | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    | undefined;

  return {
    provider: "openrouter",
    model,
    text,
    usage: {
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
    },
    latencyMs: Date.now() - started,
    usedFallback: false,
  };
}

export const openRouterProvider: AiProviderAdapter = {
  name: "openrouter",

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    const model = validateModelForProvider(input.model, "openrouter");
    let lastError: unknown;

    for (const candidateModel of getModelCandidates(model)) {
      const validatedModel = validateModelForProvider(candidateModel, "openrouter");

      for (let attempt = 0; attempt <= input.maxRetries; attempt += 1) {
        try {
          return await callOpenRouter(input, validatedModel);
        } catch (error) {
          lastError = error;

          if (candidateModel !== model && shouldTryFallbackModel(error)) {
            break;
          }

          if (candidateModel === model && shouldTryFallbackModel(error)) {
            break;
          }

          const retryable =
            error instanceof AiProviderException
              ? error.retryable
              : error instanceof Error && error.name === "TimeoutError";

          if (!retryable || attempt >= input.maxRetries) {
            break;
          }

          await sleep(Math.min(1000 * 2 ** attempt, 8000));
        }
      }

      if (candidateModel === model && shouldTryFallbackModel(lastError)) {
        continue;
      }

      break;
    }

    if (lastError instanceof AiProviderException) {
      throw lastError;
    }

    if (lastError instanceof Error && lastError.name === "TimeoutError") {
      throw new AiProviderException(AiErrorCode.PROVIDER_TIMEOUT, "OpenRouter request timed out.", {
        retryable: true,
      });
    }

    throw new AiProviderException(
      AiErrorCode.PROVIDER_UNAVAILABLE,
      lastError instanceof Error ? lastError.message : "OpenRouter request failed.",
      { retryable: true },
    );
  },
};
