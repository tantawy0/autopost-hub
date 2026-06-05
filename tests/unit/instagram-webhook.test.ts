import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  verifyInstagramWebhookChallenge,
  verifyInstagramWebhookSignature,
} from "@/lib/providers/instagram-webhook";
import { hashMetaProviderUserId, verifyMetaSignedRequest } from "@/lib/providers/meta";
import { processInstagramDeauthorizationRequest } from "@/lib/server/instagram-deauthorize";
import { createFakeSupabase } from "./helpers/fake-supabase";

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

test("Instagram webhook challenge returns the Meta challenge only for the configured token", () => {
  withEnv({ INSTAGRAM_WEBHOOK_VERIFY_TOKEN: "verify-token" }, () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "verify-token",
      "hub.challenge": "challenge-123",
    });

    assert.deepEqual(verifyInstagramWebhookChallenge(params), {
      ok: true,
      challenge: "challenge-123",
    });

    params.set("hub.verify_token", "wrong");
    assert.equal(verifyInstagramWebhookChallenge(params).ok, false);
  });
});

test("Instagram webhook signature validates the raw body without exposing secrets", () => {
  withEnv({ INSTAGRAM_APP_SECRET: "instagram-test-secret" }, () => {
    const rawBody = JSON.stringify({ object: "instagram", entry: [] });
    const signature = crypto.createHmac("sha256", process.env.INSTAGRAM_APP_SECRET!).update(rawBody).digest("hex");

    assert.equal(verifyInstagramWebhookSignature(rawBody, `sha256=${signature}`), true);
    assert.equal(verifyInstagramWebhookSignature(`${rawBody}x`, `sha256=${signature}`), false);
    assert.equal(verifyInstagramWebhookSignature(rawBody, null), false);
  });
});

test("Instagram signed callbacks can be verified with the Instagram app secret", () => {
  const payload = Buffer.from(JSON.stringify({ user_id: "ig-user-1" })).toString("base64url");
  const signature = crypto.createHmac("sha256", "instagram-callback-secret").update(payload).digest("base64url");

  assert.deepEqual(
    verifyMetaSignedRequest<{ user_id: string }>(`${signature}.${payload}`, "instagram-callback-secret"),
    { user_id: "ig-user-1" },
  );
});

test("Instagram deauthorize revokes matching Instagram accounts only", async () => {
  const client = createFakeSupabase({
    connected_accounts: [
      {
        id: "ig-account-1",
        platform: "Instagram",
        provider_user_id_hash: hashMetaProviderUserId("ig-user-1"),
        token_ciphertext: "encrypted-token",
        status: "Connected",
        reconnect_required: false,
      },
      {
        id: "fb-account-1",
        platform: "Facebook",
        provider_user_id_hash: hashMetaProviderUserId("ig-user-1"),
        token_ciphertext: "facebook-token",
        status: "Connected",
        reconnect_required: false,
      },
    ],
  });

  const result = await processInstagramDeauthorizationRequest(client as never, {
    providerUserId: "ig-user-1",
    now: new Date("2026-06-05T00:00:00.000Z"),
  });

  assert.deepEqual(result.matchedConnectedAccountIds, ["ig-account-1"]);
  assert.equal(client.tables.connected_accounts[0].status, "Revoked");
  assert.equal(client.tables.connected_accounts[0].token_ciphertext, null);
  assert.equal(client.tables.connected_accounts[0].reconnect_required, true);
  assert.equal(client.tables.connected_accounts[1].status, "Connected");
});
