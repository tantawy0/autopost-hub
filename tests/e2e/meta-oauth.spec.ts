import { expect, test } from "@playwright/test";

test.describe("Meta OAuth API", () => {
  test.skip(
    !process.env.E2E_BASE_URL && process.env.E2E_START_SERVER !== "1",
    "Set E2E_BASE_URL or E2E_START_SERVER=1 to run API E2E tests.",
  );

  test("rejects unauthenticated login starts safely", async ({ request }) => {
    const response = await request.get("/api/meta/login?platform=facebook", {
      headers: { Accept: "application/json" },
    });

    expect(response.status()).toBe(401);
    const body = (await response.json()) as { code?: string };
    expect(body).toMatchObject({ code: "auth_required" });
  });
});
