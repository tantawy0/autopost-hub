import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  buildAuthCallbackUrl,
  buildAuthPath,
  normalizeAuthNext,
} from "@/lib/auth-redirect";

describe("auth redirect helpers", () => {
  test("keeps same-origin app paths and strips unsafe external redirects", () => {
    assert.equal(normalizeAuthNext("/channels?filter=reauth"), "/channels?filter=reauth");
    assert.equal(normalizeAuthNext("https://evil.example/phish"), "/dashboard");
    assert.equal(normalizeAuthNext("//evil.example/phish"), "/dashboard");
    assert.equal(normalizeAuthNext("javascript:alert(1)"), "/dashboard");
  });

  test("builds safe auth and callback URLs", () => {
    assert.equal(buildAuthPath("/queue"), "/auth?next=%2Fqueue");

    const callback = new URL(buildAuthCallbackUrl("https://autopost.example", "/settings"));

    assert.equal(callback.origin, "https://autopost.example");
    assert.equal(callback.pathname, "/auth/callback");
    assert.equal(callback.searchParams.get("next"), "/settings");
  });
});
