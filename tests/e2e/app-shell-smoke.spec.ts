import { expect, test } from "@playwright/test";

import { canRunBrowserE2E, expectAuthenticatedAppShell, signIn } from "./helpers/auth";

test.describe("authenticated app shell smoke", () => {
  test.skip(!canRunBrowserE2E, "Set E2E_RUN_BROWSER=1, E2E_EMAIL, and E2E_PASSWORD to run browser E2E tests.");

  test("loads the authenticated shell and primary creator navigation", async ({ page }) => {
    await signIn(page);
    await expectAuthenticatedAppShell(page);
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link")).toHaveCount(10);
  });
});
