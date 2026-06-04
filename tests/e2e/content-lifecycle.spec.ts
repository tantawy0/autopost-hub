import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, signIn } from "./helpers/auth";

test.describe("content lifecycle views", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run lifecycle tests.");

  test("opens calendar, queue, and published views", async ({ page }) => {
    await signIn(page);

    await page.goto("/calendar");
    await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();

    await page.goto("/queue");
    await expect(page.getByRole("heading", { name: "Queue" })).toBeVisible();

    await page.goto("/published");
    await expect(page.getByRole("heading", { name: "Published" })).toBeVisible();
  });
});
