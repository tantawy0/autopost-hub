import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getPlanDefinition, isPaidSelfServePlan, PLAN_DEFINITIONS } from "../../lib/billing/plans";
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

describe("billing plans", () => {
  test("keeps free as the safe default plan", () => {
    assert.equal(getPlanDefinition(undefined).key, "free");
    assert.equal(getPlanDefinition("unknown").key, "free");
    assert.equal(PLAN_DEFINITIONS.free.publicSignup, true);
    assert.equal(PLAN_DEFINITIONS.free.stripePriceEnv, undefined);
  });

  test("only paid self-serve plans can be sent to checkout", () => {
    assert.equal(isPaidSelfServePlan("creator"), true);
    assert.equal(isPaidSelfServePlan("pro"), true);
    assert.equal(isPaidSelfServePlan("agency"), true);
    assert.equal(isPaidSelfServePlan("free"), false);
    assert.equal(isPaidSelfServePlan("enterprise"), false);
  });

  test("does not make Stripe required for production env readiness", () => {
    const result = validateProductionEnv(validEnv);

    assert.equal(result.ok, true);
    assert.equal(result.issues.some((issue) => issue.key.startsWith("STRIPE_")), false);
  });

  test("flags missing Stripe webhook and prices only when Stripe is enabled", () => {
    const result = validateProductionEnv({
      ...validEnv,
      STRIPE_SECRET_KEY: "sk_test_long_enough_for_validation",
    });

    assert.equal(result.ok, true);
    assert.ok(result.issues.some((issue) => issue.key === "STRIPE_WEBHOOK_SECRET" && issue.code === "provider_key_missing"));
    assert.ok(result.issues.some((issue) => issue.key === "STRIPE_PRICE_CREATOR" && issue.code === "provider_key_missing"));
    assert.ok(result.issues.some((issue) => issue.key === "STRIPE_PRICE_PRO" && issue.code === "provider_key_missing"));
    assert.ok(result.issues.some((issue) => issue.key === "STRIPE_PRICE_AGENCY" && issue.code === "provider_key_missing"));
  });
});
