import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInstagramLoginAuthorizationUrl,
  getInstagramLoginScopes,
  isInstagramProfessionalAccount,
} from "@/lib/providers/instagram-login";

function withEnv<T>(patch: Record<string, string | undefined>, run: () => T): T {
  const previous = Object.fromEntries(
    Object.keys(patch).map((key) => [key, process.env[key]]),
  ) as Record<string, string | undefined>;

  try {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }

    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("Instagram Login uses the Instagram OAuth surface instead of Facebook Login", () => {
  withEnv(
    {
      META_APP_ID: "meta-app-id",
      META_APP_SECRET: "meta-app-secret-with-length",
      INSTAGRAM_REDIRECT_URI: "https://autopost-hub.vercel.app/api/instagram/callback",
      INSTAGRAM_SCOPES: undefined,
    },
    () => {
      const url = buildInstagramLoginAuthorizationUrl(
        { userId: "user-1", returnTo: "/channels", nonce: "nonce" },
        "https://autopost-hub.vercel.app",
      );
      const parsed = new URL(url);

      assert.equal(parsed.origin, "https://www.instagram.com");
      assert.equal(parsed.pathname, "/oauth/authorize");
      assert.equal(parsed.searchParams.get("enable_fb_login"), "0");
      assert.equal(parsed.searchParams.get("force_authentication"), "1");
      assert.equal(
        parsed.searchParams.get("redirect_uri"),
        "https://autopost-hub.vercel.app/api/instagram/callback",
      );
      assert.equal(getInstagramLoginScopes().includes("instagram_business_basic"), true);
      assert.equal(getInstagramLoginScopes().includes("instagram_business_content_publish"), true);
    },
  );
});

test("Instagram Login keeps local OAuth callbacks on localhost", () => {
  withEnv(
    {
      META_APP_ID: "meta-app-id",
      META_APP_SECRET: "meta-app-secret-with-length",
      INSTAGRAM_REDIRECT_URI: "https://autopost-hub.vercel.app/api/instagram/callback",
      INSTAGRAM_SCOPES: undefined,
    },
    () => {
      const url = buildInstagramLoginAuthorizationUrl(
        { userId: "user-1", returnTo: "/channels", nonce: "nonce" },
        "http://localhost:3000",
      );
      const parsed = new URL(url);

      assert.equal(
        parsed.searchParams.get("redirect_uri"),
        "http://localhost:3000/api/instagram/callback",
      );
    },
  );
});

test("Instagram Login accepts Business and Creator accounts only", () => {
  assert.equal(isInstagramProfessionalAccount({ id: "ig-1", account_type: "BUSINESS" }), true);
  assert.equal(isInstagramProfessionalAccount({ id: "ig-1", account_type: "MEDIA_CREATOR" }), true);
  assert.equal(isInstagramProfessionalAccount({ id: "ig-1", account_type: "PERSONAL" }), false);
});
