import { expect, test } from "@playwright/test";

test.describe("scheduler API", () => {
  test.skip(
    !process.env.E2E_BASE_URL && process.env.E2E_START_SERVER !== "1",
    "Set E2E_BASE_URL or E2E_START_SERVER=1 to run API E2E tests.",
  );

  test("rejects missing scheduler secret", async ({ request }) => {
    const response = await request.post("/api/scheduler/process-due-posts", {
      data: { limit: 1, dryRun: true },
    });

    expect(response.status()).toBe(401);
    const body = (await response.json()) as { code?: string };
    expect(body).toMatchObject({ code: "cron_unauthorized" });
  });
});
