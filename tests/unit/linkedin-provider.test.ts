import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import {
  buildLinkedInAuthorizationUrl,
  publishLinkedInMemberPost,
  verifyLinkedInState,
} from "@/lib/providers/linkedin";
import { PublishingException, PublishErrorCode } from "@/lib/publishing-errors";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

describe("LinkedIn provider foundation", () => {
  test("builds signed OAuth authorization URLs without exposing secrets", () => {
    process.env.LINKEDIN_CLIENT_ID = "client-id";
    process.env.LINKEDIN_CLIENT_SECRET = "client-secret";
    process.env.LINKEDIN_SCOPES = "openid,profile,email,w_member_social";

    const url = new URL(
      buildLinkedInAuthorizationUrl(
        { userId: "user-1", returnTo: "/channels", nonce: "nonce-1" },
        "http://localhost:3003",
      ),
    );

    assert.equal(url.origin, "https://www.linkedin.com");
    assert.equal(url.searchParams.get("client_id"), "client-id");
    assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:3003/api/linkedin/callback");
    assert.equal(url.searchParams.get("scope"), "openid profile email w_member_social");
    assert.equal(url.toString().includes("client-secret"), false);

    const state = url.searchParams.get("state");
    assert.ok(state);
    assert.deepEqual(verifyLinkedInState(state), {
      userId: "user-1",
      returnTo: "/channels",
      nonce: "nonce-1",
    });
  });

  test("publishes text-only member posts through the versioned Posts API", async () => {
    process.env.LINKEDIN_API_VERSION = "202605";
    const calls: Array<{ url: string; init: RequestInit }> = [];

    globalThis.fetch = (async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(null, {
        status: 201,
        headers: { "x-restli-id": "urn:li:share:1" },
      });
    }) as typeof fetch;

    const result = await publishLinkedInMemberPost({
      caption: "Launch note",
      media: [],
      accessToken: "token",
      authorUrn: "urn:li:person:abc",
      idempotencyKey: "idem-1",
    });

    assert.equal(result.ok, true);
    assert.equal(result.providerPostId, "urn:li:share:1");
    assert.equal(calls[0].url, "https://api.linkedin.com/rest/posts");
    assert.equal((calls[0].init.headers as Record<string, string>)["LinkedIn-Version"], "202605");
    assert.match(String(calls[0].init.body), /Launch note/);
  });

  test("rejects LinkedIn media before live provider asset upload exists", async () => {
    await assert.rejects(
      () =>
        publishLinkedInMemberPost({
          caption: "Launch note",
          media: [{ url: "https://cdn.example.test/image.png", mediaType: "image" }],
          accessToken: "token",
          authorUrn: "urn:li:person:abc",
        }),
      (error) =>
        error instanceof PublishingException &&
        error.code === PublishErrorCode.UNSUPPORTED_MEDIA_TYPE,
    );
  });
});
