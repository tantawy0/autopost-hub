import { expect, type Page } from "@playwright/test";

export const hasE2ECredentials = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
export const canRunBrowserE2E = process.env.E2E_RUN_BROWSER === "1" && hasE2ECredentials;

export async function signIn(page: Page) {
  if (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD to run authenticated E2E tests.");
  }

  await page.goto("/auth");
  await page.getByLabel("Email address").fill(process.env.E2E_EMAIL);
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD);
  await page.getByRole("button", { name: /continue to workspace/i }).click();
  await page.waitForURL("/dashboard");
}

export async function expectAuthenticatedAppShell(page: Page) {
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Notifications/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Create/i }).first()).toBeVisible();
}
