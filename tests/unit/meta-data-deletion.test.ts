import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, test } from "node:test";

import {
  hashMetaProviderUserId,
  verifyMetaSignedRequest,
} from "../../lib/providers/meta";
import { processMetaDataDeletionRequest } from "../../lib/server/meta-data-deletion";
import { createFakeSupabase } from "./helpers/fake-supabase";

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function createSignedRequest(payload: Record<string, unknown>, secret: string) {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest();

  return `${base64Url(signature)}.${encodedPayload}`;
}

describe("Meta data deletion callback", () => {
  test("verifies signed_request payloads with the Meta app secret", () => {
    const previous = process.env.META_APP_SECRET;
    process.env.META_APP_SECRET = "meta-test-secret-with-enough-length";

    try {
      const signedRequest = createSignedRequest(
        { algorithm: "HMAC-SHA256", user_id: "meta-user-1", issued_at: 1_780_000_000 },
        process.env.META_APP_SECRET,
      );
      const payload = verifyMetaSignedRequest<{ user_id: string }>(signedRequest);

      assert.equal(payload.user_id, "meta-user-1");
      assert.throws(
        () => verifyMetaSignedRequest<{ user_id: string }>(`${signedRequest.slice(0, -2)}xx`),
        /Invalid Meta signed request signature/,
      );
    } finally {
      if (previous === undefined) {
        delete process.env.META_APP_SECRET;
      } else {
        process.env.META_APP_SECRET = previous;
      }
    }
  });

  test("disconnects matching Meta accounts and removes imported Meta data", async () => {
    const providerUserIdHash = hashMetaProviderUserId("meta-user-1");
    const client = createFakeSupabase({
      connected_accounts: [
        {
          id: "account-1",
          user_id: "user-1",
          workspace_id: "workspace-1",
          platform: "Facebook",
          provider_user_id_hash: providerUserIdHash,
          status: "Connected",
          token_ciphertext: "encrypted-token",
          refresh_token_ciphertext: "encrypted-refresh-token",
          reconnect_required: false,
        },
        {
          id: "account-2",
          user_id: "user-2",
          workspace_id: "workspace-2",
          platform: "Facebook",
          provider_user_id_hash: hashMetaProviderUserId("other-meta-user"),
          status: "Connected",
        },
      ],
      social_posts: [
        { id: "social-post-1", connected_account_id: "account-1" },
        { id: "social-post-2", connected_account_id: "account-2" },
      ],
      social_post_metric_snapshots: [
        { id: "metric-1", connected_account_id: "account-1" },
        { id: "metric-2", connected_account_id: "account-2" },
      ],
      engagement_threads: [
        { id: "thread-1", connected_account_id: "account-1" },
        { id: "thread-2", connected_account_id: "account-2" },
      ],
      platform_data_deletion_requests: [],
    });

    const result = await processMetaDataDeletionRequest(client as never, {
      providerUserId: "meta-user-1",
      appUrl: "https://autopost-hub.vercel.app",
      confirmationCode: "meta-del-test",
      now: new Date("2026-06-04T00:00:00.000Z"),
    });

    assert.equal(result.status, "processed");
    assert.deepEqual(result.matchedConnectedAccountIds, ["account-1"]);
    assert.equal(client.tables.connected_accounts[0].status, "Revoked");
    assert.equal(client.tables.connected_accounts[0].token_ciphertext, null);
    assert.equal(client.tables.connected_accounts[0].reconnect_required, true);
    assert.deepEqual(client.tables.social_posts.map((row) => row.id), ["social-post-2"]);
    assert.deepEqual(client.tables.social_post_metric_snapshots.map((row) => row.id), ["metric-2"]);
    assert.deepEqual(client.tables.engagement_threads.map((row) => row.id), ["thread-2"]);
    assert.equal(client.tables.platform_data_deletion_requests[0].confirmation_code, "meta-del-test");
  });
});
