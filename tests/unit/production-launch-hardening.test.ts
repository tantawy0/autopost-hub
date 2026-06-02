import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  OperationalInputError,
  parseBackgroundJobTypes,
  parseOperationalLimit,
} from "../../lib/server/operational-input";
import { validateProductionEnv } from "../../lib/server/production-env";

const validEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_APP_URL: "https://autopost.example",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-that-is-long-enough-for-production",
  CRON_SECRET: "cron-secret-that-is-long-enough-for-production",
  TOKEN_ENCRYPTION_KEY: "encryption-key-that-is-long-enough-for-production",
  META_APP_ID: "meta-app-id",
  META_APP_SECRET: "meta-secret-long-enough",
  META_REDIRECT_URI: "https://autopost.example/api/meta/callback",
};

describe("production launch hardening", () => {
  test("accepts complete production configuration", () => {
    const result = validateProductionEnv(validEnv);

    assert.equal(result.ok, true);
    assert.deepEqual(result.missingRequired, []);
    assert.deepEqual(result.issues, []);
  });

  test("rejects placeholders, short secrets, redirect drift, and missing selected provider keys", () => {
    const result = validateProductionEnv({
      ...validEnv,
      CRON_SECRET: "short",
      TOKEN_ENCRYPTION_KEY: "replace-with-key",
      META_REDIRECT_URI: "https://autopost.example/wrong-callback",
      AI_PRIMARY_PROVIDER: "openrouter",
    });

    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.key === "CRON_SECRET" && issue.code === "secret_too_short"));
    assert.ok(result.issues.some((issue) => issue.key === "TOKEN_ENCRYPTION_KEY" && issue.code === "placeholder_value"));
    assert.ok(result.issues.some((issue) => issue.key === "META_REDIRECT_URI" && issue.code === "redirect_uri_mismatch"));
    assert.ok(result.issues.some((issue) => issue.key === "OPENROUTER_API_KEY" && issue.code === "provider_key_missing"));
  });

  test("caps cron limits and rejects malformed worker filters", () => {
    assert.equal(parseOperationalLimit(undefined, 25), 25);
    assert.equal(parseOperationalLimit(999, 25), 100);
    assert.deepEqual(parseBackgroundJobTypes(["social_sync", "social_sync", "token_refresh"]), [
      "social_sync",
      "token_refresh",
    ]);
    assert.throws(() => parseOperationalLimit("25", 25), OperationalInputError);
    assert.throws(() => parseBackgroundJobTypes(["unknown_job"]), OperationalInputError);
  });
});
