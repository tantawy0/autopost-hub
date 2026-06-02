import "server-only";

import {
  getAiRuntimeConfig,
  type AiProviderName,
  isAiProviderConfigured,
} from "@/lib/server/ai/model-config";
import { geminiProvider } from "@/lib/server/ai/providers/gemini";
import { heuristicProvider } from "@/lib/server/ai/providers/heuristic";
import { openRouterProvider } from "@/lib/server/ai/providers/openrouter";
import type { AiProviderAdapter } from "@/lib/server/ai/providers/types";

const PROVIDERS: Record<AiProviderName, AiProviderAdapter | undefined> = {
  openrouter: openRouterProvider,
  gemini: geminiProvider,
  heuristic: heuristicProvider,
  "21st": undefined,
};

export function getAiProvider(name: AiProviderName): AiProviderAdapter {
  const provider = PROVIDERS[name];

  if (!provider) {
    return heuristicProvider;
  }

  return provider;
}

export function resolvePrimaryAiProvider(): AiProviderAdapter {
  const config = getAiRuntimeConfig();
  return getAiProvider(config.primaryProvider);
}

export function getAiProviderStatus(): {
  primaryProvider: AiProviderName;
  openRouterConfigured: boolean;
  geminiConfigured: boolean;
  twentyFirstConfigured: boolean;
  heuristicAvailable: boolean;
} {
  const config = getAiRuntimeConfig();

  return {
    primaryProvider: config.primaryProvider,
    openRouterConfigured: isAiProviderConfigured("openrouter"),
    geminiConfigured: isAiProviderConfigured("gemini"),
    twentyFirstConfigured: isAiProviderConfigured("21st"),
    heuristicAvailable: true,
  };
}
