import { expect, test } from "@playwright/test";

const canRunApiE2E = Boolean(process.env.E2E_BASE_URL || process.env.E2E_START_SERVER === "1");

async function expectNoSecretExposure(responseText: string) {
  expect(responseText).not.toMatch(/\bsk-(?:or-v1|proj|live)-[A-Za-z0-9_-]{20,}\b/);
  expect(responseText).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|META_APP_SECRET|TOKEN_ENCRYPTION_KEY/);
  expect(responseText).not.toMatch(/OPENROUTER_API_KEY|API_KEY_21ST|CRON_SECRET|WORKER_SECRET/);
}

test.describe("API authorization and safe errors", () => {
  test.skip(!canRunApiE2E, "Set E2E_BASE_URL or E2E_START_SERVER=1 to run API E2E tests.");

  test("rejects unauthenticated draft autosave", async ({ request }) => {
    const response = await request.post("/api/posts/autosave", {
      data: { clientDraftId: "e2e-smoke", payload: { caption: "draft" } },
    });
    const text = await response.text();

    expect(response.status()).toBe(401);
    expect(JSON.parse(text)).toMatchObject({ code: "auth_required" });
    await expectNoSecretExposure(text);
  });

  test("rejects operational routes without the cron secret", async ({ request }) => {
    for (const response of [
      await request.get("/api/worker/health"),
      await request.post("/api/worker/process", { data: { limit: 1, dryRun: true } }),
      await request.get("/api/ops/readiness"),
      await request.get("/api/cron/worker"),
      await request.get("/api/cron/scheduler"),
    ]) {
      const text = await response.text();

      expect(response.status()).toBe(401);
      expect(JSON.parse(text)).toMatchObject({ code: "cron_unauthorized" });
      await expectNoSecretExposure(text);
    }
  });

  test("rejects unauthenticated analytics and AI routes", async ({ request }) => {
    const analytics = await request.post("/api/analytics/ingest", {
      data: { platform: "Instagram", metricDate: "2026-05-25" },
    });
    const assistant = await request.post("/api/ai/assistant", {
      data: { caption: "hello" },
    });

    for (const response of [analytics, assistant]) {
      const text = await response.text();

      expect(response.status()).toBe(401);
      expect(JSON.parse(text)).toMatchObject({ code: "auth_required" });
      await expectNoSecretExposure(text);
    }
  });
});
