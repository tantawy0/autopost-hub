import "server-only";

import type { AiProviderName } from "@/lib/server/ai/model-config";
import type { PromptVersionRecord } from "@/lib/server/ai/prompt-versions";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiCompletionInput = {
  provider: AiProviderName;
  model: string;
  promptVersion: PromptVersionRecord;
  messages: AiChatMessage[];
  generationType: string;
  timeoutMs: number;
  maxRetries: number;
};

export type AiCompletionUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type AiCompletionResult = {
  provider: AiProviderName;
  model: string;
  text: string;
  usage?: AiCompletionUsage;
  latencyMs: number;
  usedFallback: boolean;
};

export interface AiProviderAdapter {
  readonly name: AiProviderName;
  complete(input: AiCompletionInput): Promise<AiCompletionResult>;
}
