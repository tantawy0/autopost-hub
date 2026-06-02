import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { validateModelForProvider } from "../../lib/server/ai/model-config";
import { generateAssistantSuggestions } from "../../lib/server/ai/assistant-service";
import { openRouterProvider } from "../../lib/server/ai/providers/openrouter";
import { createFakeSupabase } from "./helpers/fake-supabase";

describe("AI provider fallback behavior", () => {
  test("falls back to the heuristic provider when OpenRouter rejects the request", async () => {
    const previous = {
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL,
      maxRetries: process.env.AI_MAX_RETRIES,
      timeout: process.env.AI_REQUEST_TIMEOUT_MS,
      provider: process.env.AI_PRIMARY_PROVIDER,
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
    };
    const originalFetch = globalThis.fetch;
    const client = createFakeSupabase({
      ai_prompt_versions: [],
      ai_usage_events: [],
      ai_generations: [],
    });
    let fetchCalls = 0;

    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.OPENROUTER_BASE_URL = "https://openrouter.invalid/api/v1";
    process.env.AI_MAX_RETRIES = "0";
    process.env.AI_REQUEST_TIMEOUT_MS = "1000";
    process.env.AI_PRIMARY_PROVIDER = "openrouter";
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({ error: { message: "provider key is invalid" } }),
        { status: 401, headers: { "content-type": "application/json" } },
      );
    };

    try {
      const suggestions = await generateAssistantSuggestions(client as never, {
        workspaceId: "workspace-1",
        userId: "user-1",
        caption: "New reel about batching creator content.",
      });

      assert.equal(fetchCalls, 1);
      assert.equal(suggestions.length, 3);
      assert.deepEqual(
        client.tables.ai_usage_events.map((event) => event.status),
        ["failed", "fallback"],
      );
      assert.equal(client.tables.ai_usage_events[0].provider, "openrouter");
      assert.equal(client.tables.ai_usage_events[1].provider, "heuristic");
      assert.equal(client.tables.ai_generations[0].provider, "heuristic");
      assert.equal(
        (client.tables.ai_generations[0].output as { usedFallback?: boolean }).usedFallback,
        true,
      );
    } finally {
      globalThis.fetch = originalFetch;
      if (previous.openRouterApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = previous.openRouterApiKey;
      if (previous.baseUrl === undefined) delete process.env.OPENROUTER_BASE_URL;
      else process.env.OPENROUTER_BASE_URL = previous.baseUrl;
      if (previous.maxRetries === undefined) delete process.env.AI_MAX_RETRIES;
      else process.env.AI_MAX_RETRIES = previous.maxRetries;
      if (previous.timeout === undefined) delete process.env.AI_REQUEST_TIMEOUT_MS;
      else process.env.AI_REQUEST_TIMEOUT_MS = previous.timeout;
      if (previous.provider === undefined) delete process.env.AI_PRIMARY_PROVIDER;
      else process.env.AI_PRIMARY_PROVIDER = previous.provider;
      if (previous.geminiApiKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previous.geminiApiKey;
      if (previous.geminiModel === undefined) delete process.env.GEMINI_MODEL;
      else process.env.GEMINI_MODEL = previous.geminiModel;
    }
  });

  test("keeps heuristic as the local default even when paid provider keys are present", async () => {
    const previous = {
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      provider: process.env.AI_PRIMARY_PROVIDER,
    };
    const originalFetch = globalThis.fetch;
    const client = createFakeSupabase({
      ai_prompt_versions: [],
      ai_usage_events: [],
      ai_generations: [],
    });
    let fetchCalls = 0;

    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    delete process.env.AI_PRIMARY_PROVIDER;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response("{}", { status: 200 });
    };

    try {
      const suggestions = await generateAssistantSuggestions(client as never, {
        workspaceId: "workspace-1",
        userId: "user-1",
        caption: "This is a calm local test.",
      });

      assert.equal(fetchCalls, 0);
      assert.equal(suggestions.length, 3);
      assert.equal(client.tables.ai_usage_events[0].provider, "heuristic");
      assert.equal(client.tables.ai_generations[0].provider, "heuristic");
    } finally {
      globalThis.fetch = originalFetch;
      if (previous.openRouterApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = previous.openRouterApiKey;
      if (previous.provider === undefined) delete process.env.AI_PRIMARY_PROVIDER;
      else process.env.AI_PRIMARY_PROVIDER = previous.provider;
    }
  });

  test("falls back to heuristic when Gemini authentication fails", async () => {
    const previous = {
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiModel: process.env.GEMINI_MODEL,
      provider: process.env.AI_PRIMARY_PROVIDER,
      maxRetries: process.env.AI_MAX_RETRIES,
      timeout: process.env.AI_REQUEST_TIMEOUT_MS,
    };
    const originalFetch = globalThis.fetch;
    const client = createFakeSupabase({
      ai_prompt_versions: [],
      ai_usage_events: [],
      ai_generations: [],
    });
    let fetchCalls = 0;

    process.env.AI_PRIMARY_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-1.5-flash";
    process.env.AI_MAX_RETRIES = "0";
    process.env.AI_REQUEST_TIMEOUT_MS = "1000";
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify({ error: { message: "API key not valid" } }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    };

    try {
      const suggestions = await generateAssistantSuggestions(client as never, {
        workspaceId: "workspace-1",
        userId: "user-1",
        caption: "New carousel about creator systems.",
      });

      assert.equal(fetchCalls, 1);
      assert.equal(suggestions.length, 3);
      assert.deepEqual(
        client.tables.ai_usage_events.map((event) => event.status),
        ["failed", "fallback"],
      );
      assert.equal(client.tables.ai_usage_events[0].provider, "gemini");
      assert.equal(client.tables.ai_usage_events[1].provider, "heuristic");
      assert.equal(client.tables.ai_generations[0].provider, "heuristic");
    } finally {
      globalThis.fetch = originalFetch;
      if (previous.geminiApiKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previous.geminiApiKey;
      if (previous.geminiModel === undefined) delete process.env.GEMINI_MODEL;
      else process.env.GEMINI_MODEL = previous.geminiModel;
      if (previous.provider === undefined) delete process.env.AI_PRIMARY_PROVIDER;
      else process.env.AI_PRIMARY_PROVIDER = previous.provider;
      if (previous.maxRetries === undefined) delete process.env.AI_MAX_RETRIES;
      else process.env.AI_MAX_RETRIES = previous.maxRetries;
      if (previous.timeout === undefined) delete process.env.AI_REQUEST_TIMEOUT_MS;
      else process.env.AI_REQUEST_TIMEOUT_MS = previous.timeout;
    }
  });

  test("allows Gemini 2.5 Pro OpenRouter models and tries stable model when preview is unavailable", async () => {
    const previous = {
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    };
    const originalFetch = globalThis.fetch;
    const models: string[] = [];

    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.OPENROUTER_BASE_URL = "https://openrouter.invalid/api/v1";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3003";
    globalThis.fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string };
      models.push(body.model ?? "");

      if (body.model === "google/gemini-2.5-pro-preview") {
        return new Response(JSON.stringify({ error: { message: "No endpoints found for model" } }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "[\"one\", \"two\", \"three\"]" } }],
          usage: { total_tokens: 12 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    try {
      assert.equal(
        validateModelForProvider("google/gemini-2.5-pro-preview", "openrouter"),
        "google/gemini-2.5-pro-preview",
      );
      assert.equal(
        validateModelForProvider("google/gemini-2.5-pro", "openrouter"),
        "google/gemini-2.5-pro",
      );

      const result = await openRouterProvider.complete({
        provider: "openrouter",
        model: "google/gemini-2.5-pro-preview",
        promptVersion: {
          promptKey: "assistant_suggestions",
          version: "test",
          systemPrompt: "Return JSON.",
          metadata: {},
        },
        generationType: "assistant_suggestions",
        timeoutMs: 1000,
        maxRetries: 0,
        messages: [{ role: "user", content: "test" }],
      });

      assert.equal(result.model, "google/gemini-2.5-pro");
      assert.deepEqual(models, ["google/gemini-2.5-pro-preview", "google/gemini-2.5-pro"]);
    } finally {
      globalThis.fetch = originalFetch;
      if (previous.openRouterApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = previous.openRouterApiKey;
      if (previous.baseUrl === undefined) delete process.env.OPENROUTER_BASE_URL;
      else process.env.OPENROUTER_BASE_URL = previous.baseUrl;
      if (previous.appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = previous.appUrl;
    }
  });
});
