import "server-only";

import { AiErrorCode, AiProviderException } from "@/lib/server/ai/ai-errors";
import { getAiRuntimeConfig, validateModelForProvider } from "@/lib/server/ai/model-config";
import type { AiCompletionInput, AiCompletionResult, AiProviderAdapter } from "@/lib/server/ai/providers/types";

function mapHttpError(status: number, message: string): AiProviderException {
  if (status === 400 || status === 401 || status === 403) {
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

function toGeminiParts(input: AiCompletionInput) {
  const systemMessages = input.messages.filter((message) => message.role === "system");
  const chatMessages = input.messages.filter((message) => message.role !== "system");

  return {
    systemInstruction:
      systemMessages.length > 0
        ? { parts: systemMessages.map((message) => ({ text: message.content })) }
        : undefined,
    contents: chatMessages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
  };
}

async function callGemini(input: AiCompletionInput, model: string): Promise<AiCompletionResult> {
  const config = getAiRuntimeConfig();

  if (!config.geminiApiKey) {
    throw new AiProviderException(AiErrorCode.CONFIGURATION_ERROR, "GEMINI_API_KEY is not configured.", {
      retryable: false,
    });
  }

  const started = Date.now();
  const payload = toGeminiParts(input);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        generationConfig: {
          temperature: 0.4,
        },
      }),
      signal: AbortSignal.timeout(input.timeoutMs),
    },
  );

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const message =
      (body?.error as { message?: string } | undefined)?.message ??
      `Gemini request failed with status ${response.status}.`;
    throw mapHttpError(response.status, message);
  }

  const candidates = body?.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const text = candidates?.[0]?.content?.parts
    ?.map((part) => part.text?.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new AiProviderException(AiErrorCode.INVALID_RESPONSE, "Gemini returned an empty completion.", {
      retryable: false,
    });
  }

  const usage = body?.usageMetadata as
    | { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
    | undefined;

  return {
    provider: "gemini",
    model,
    text,
    usage: {
      promptTokens: usage?.promptTokenCount,
      completionTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
    },
    latencyMs: Date.now() - started,
    usedFallback: false,
  };
}

export const geminiProvider: AiProviderAdapter = {
  name: "gemini",

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    const model = validateModelForProvider(input.model, "gemini");
    let lastError: unknown;

    for (let attempt = 0; attempt <= input.maxRetries; attempt += 1) {
      try {
        return await callGemini(input, model);
      } catch (error) {
        lastError = error;
        const retryable =
          error instanceof AiProviderException
            ? error.retryable
            : error instanceof Error && error.name === "TimeoutError";

        if (!retryable || attempt >= input.maxRetries) break;
      }
    }

    if (lastError instanceof AiProviderException) throw lastError;

    if (lastError instanceof Error && lastError.name === "TimeoutError") {
      throw new AiProviderException(AiErrorCode.PROVIDER_TIMEOUT, "Gemini request timed out.", {
        retryable: true,
      });
    }

    throw new AiProviderException(
      AiErrorCode.PROVIDER_UNAVAILABLE,
      lastError instanceof Error ? lastError.message : "Gemini request failed.",
      { retryable: true },
    );
  },
};
