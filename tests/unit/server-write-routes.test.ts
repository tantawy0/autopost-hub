import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function requestCheckBlock(source: string, name: string) {
  const start = source.indexOf(`name: "${name}"`);

  assert.notEqual(start, -1, `${name} check not found`);

  const end = source.indexOf("}));", start);

  assert.notEqual(end, -1, `${name} check block end not found`);

  return source.slice(start, end);
}

function exportedFunctionSource(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`);

  assert.notEqual(start, -1, `${name} export not found`);

  const next = source.indexOf("\nexport ", start + 1);

  return source.slice(start, next === -1 ? undefined : next);
}

describe("server write routes", () => {
  test("post save and media upload client helpers use authenticated server routes", () => {
    const source = read("lib/posts.ts");
    const savePost = exportedFunctionSource(source, "savePost");
    const uploadMediaAsset = exportedFunctionSource(source, "uploadMediaAsset");

    assert.match(savePost, /fetch\("\/api\/posts\/save"/);
    assert.doesNotMatch(savePost, /\.from\("posts"\)/);
    assert.match(uploadMediaAsset, /fetch\("\/api\/media\/upload"/);
    assert.doesNotMatch(uploadMediaAsset, /supabase\.storage/);
  });

  test("server routes enforce auth, RBAC, rate limits, and plan limits", () => {
    const postRoute = read("app/api/posts/save/route.ts");
    const mediaRoute = read("app/api/media/upload/route.ts");
    const service = read("lib/server/posts/service.ts");

    for (const route of [postRoute, mediaRoute]) {
      assert.match(route, /requireAuthenticatedUser/);
      assert.match(route, /requireWorkspacePermission/);
      assert.match(route, /assertRateLimit/);
    }

    assert.match(service, /metric: "scheduledPostsMonthly"/);
    assert.match(service, /metric: "mediaStorageMb"/);
    assert.match(service, /validateMediaFile/);
    assert.match(service, /buildMediaStoragePath/);
    assert.match(service, /MEDIA_BUCKET/);
  });

  test("billing checkout and portal routes require admin billing permission", () => {
    const checkoutRoute = read("app/api/billing/checkout/route.ts");
    const portalRoute = read("app/api/billing/portal/route.ts");
    const stripeClient = read("lib/server/billing/stripe.ts");

    for (const route of [checkoutRoute, portalRoute]) {
      assert.match(route, /requireAuthenticatedUser/);
      assert.match(route, /"billing_manage"/);
      assert.match(route, /assertRateLimit/);
    }

    assert.match(stripeClient, /STRIPE_API_VERSION/);
    assert.match(stripeClient, /apiVersion: STRIPE_API_VERSION/);
  });

  test("cron smoke uses POST dry-runs and never executes valid GET cron bridges", () => {
    const smoke = read("scripts/cron-production-smoke.mjs");

    assert.match(smoke, /"worker publish dry-run"/);
    assert.match(smoke, /"scheduler due-post dry-run"/);
    assert.match(smoke, /dryRun: true/);
    assert.match(smoke, /"vercel worker bridge rejects missing secret"/);
    assert.doesNotMatch(requestCheckBlock(smoke, "vercel worker bridge rejects missing secret"), /authHeaders/);
    assert.doesNotMatch(requestCheckBlock(smoke, "vercel scheduler bridge rejects missing secret"), /authHeaders/);
  });
});
