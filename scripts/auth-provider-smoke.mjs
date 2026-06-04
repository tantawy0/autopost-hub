import { chromium } from "@playwright/test";

const baseUrl = (process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3137")
  .replace(/\/+$/, "");
const providers = (process.env.SMOKE_PROVIDERS || "google,github")
  .split(",")
  .map((provider) => provider.trim().toLowerCase())
  .filter(Boolean);

function record(checks, name, ok, details = undefined) {
  checks.push({ name, ok, ...(details ? { details } : {}) });
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    const params = new URLSearchParams(url.search);

    for (const key of Array.from(params.keys())) {
      params.set(key, /error/i.test(key) ? params.get(key) || "[set]" : "[redacted]");
    }

    url.search = params.toString();
    return url.toString();
  } catch {
    return "[unavailable]";
  }
}

function providerPattern(provider) {
  if (provider === "google") return /accounts\.google\.com|google\.com\/signin/i;
  if (provider === "github") return /github\.com\/login\/oauth|github\.com\/session|github\.com\/login/i;

  return new RegExp(provider, "i");
}

async function checkHealth(request, checks) {
  try {
    const response = await request.get(`${baseUrl}/api/health`);
    record(checks, "public health endpoint", response.ok(), {
      status: response.status(),
    });
  } catch (error) {
    record(checks, "public health endpoint", false, {
      message: error instanceof Error ? error.message : "Health request failed.",
    });
  }
}

async function checkSignedOutRedirect(page, checks) {
  try {
    await page.context().clearCookies();
    await page.goto(`${baseUrl}/auth`);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForURL(/\/auth/, { timeout: 15_000 });

    const current = page.url();
    record(checks, "protected route preserves auth next redirect", /\/auth\?next=%2Fdashboard/.test(current), {
      url: safeUrl(current),
    });
  } catch (error) {
    record(checks, "protected route preserves auth next redirect", false, {
      url: safeUrl(page.url()),
      message: error instanceof Error ? error.message : "Redirect check failed.",
    });
  }
}

async function checkCallbackError(page, checks) {
  try {
    await page.goto(`${baseUrl}/auth/callback?error=access_denied&next=%2Fdashboard`);
    await page.getByRole("heading", { name: /sign-in needs attention/i }).waitFor({ timeout: 10_000 });
    const content = await page.textContent("body");

    record(checks, "auth callback renders provider errors safely", Boolean(content?.includes("access_denied")), {
      containsSecretShape: /sk-[a-z0-9_-]+|service_role|client_secret/i.test(content || ""),
    });
  } catch (error) {
    record(checks, "auth callback renders provider errors safely", false, {
      url: safeUrl(page.url()),
      message: error instanceof Error ? error.message : "Callback check failed.",
    });
  }
}

async function checkProviderStart(browser, provider, checks) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/auth?next=%2Fdashboard`);
    await page.getByRole("button", { name: new RegExp(`continue with ${provider}`, "i") }).click();
    await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(2500);

    const current = page.url();
    const startedAtProvider = providerPattern(provider).test(current);
    const stayedOnSupabaseAuthorize = /supabase\.co\/auth\/v1\/authorize/i.test(current);
    const returnedWithError = current.startsWith(`${baseUrl}/auth/callback`) && current.includes("error=");
    const ok = startedAtProvider || stayedOnSupabaseAuthorize;

    record(checks, `${provider} OAuth starts`, ok, {
      url: safeUrl(current),
      returnedWithError,
    });
  } catch (error) {
    record(checks, `${provider} OAuth starts`, false, {
      url: safeUrl(page.url()),
      message: error instanceof Error ? error.message : "OAuth start failed.",
    });
  } finally {
    await context.close();
  }
}

async function checkEmailLogin(browser, checks) {
  const email = process.env.SMOKE_E2E_EMAIL || process.env.E2E_EMAIL;
  const password = process.env.SMOKE_E2E_PASSWORD || process.env.E2E_PASSWORD;

  if (!email || !password || process.env.SMOKE_EMAIL_LOGIN !== "1") {
    record(checks, "email/password production login", true, { skipped: true });
    return;
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/auth?next=%2Fdashboard`);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /continue to workspace/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await page.getByRole("navigation", { name: "Primary" }).waitFor({ timeout: 15_000 });
    record(checks, "email/password production login", true);
  } catch (error) {
    record(checks, "email/password production login", false, {
      message: error instanceof Error ? error.message : "Login failed.",
    });
  } finally {
    await context.close();
  }
}

async function main() {
  const checks = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await checkHealth(context.request, checks);
    await checkSignedOutRedirect(page, checks);
    await checkCallbackError(page, checks);

    for (const provider of providers) {
      await checkProviderStart(browser, provider, checks);
    }

    await checkEmailLogin(browser, checks);
  } finally {
    await context.close();
    await browser.close();
  }

  const failed = checks.filter((check) => !check.ok);

  console.log(JSON.stringify({
    ok: failed.length === 0,
    baseUrl,
    checks,
  }, null, 2));

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: error instanceof Error ? error.message : "Auth provider smoke failed.",
  }, null, 2));
  process.exitCode = 1;
});
