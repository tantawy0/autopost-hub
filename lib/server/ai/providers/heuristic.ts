import "server-only";

import { buildAssistantSuggestions } from "@/lib/ai-content";
import type { AiCompletionInput, AiCompletionResult, AiProviderAdapter } from "@/lib/server/ai/providers/types";

function extractUserPrompt(messages: AiCompletionInput["messages"]): string {
  const userMessage = [...messages].reverse().find((message) => message.role === "user");
  return userMessage?.content?.trim() ?? "";
}

export const heuristicProvider: AiProviderAdapter = {
  name: "heuristic",

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    const started = Date.now();
    const prompt = extractUserPrompt(input.messages);

    if (input.generationType === "assistant_suggestions") {
      const suggestions = buildAssistantSuggestions(prompt);
      return {
        provider: "heuristic",
        model: input.model,
        text: JSON.stringify(suggestions),
        latencyMs: Date.now() - started,
        usedFallback: false,
      };
    }

    return {
      provider: "heuristic",
      model: input.model,
      text: prompt,
      latencyMs: Date.now() - started,
      usedFallback: false,
    };
  },
};
