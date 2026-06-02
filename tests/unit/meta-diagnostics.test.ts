import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getMetaScopes, getMissingMetaScopes } from "../../lib/providers/meta";
import {
  buildMetaConnectionDiagnostics,
  buildMetaSetupDiagnostics,
  summarizeMetaDestinationDiscovery,
} from "../../lib/providers/meta-diagnostics";
import { createFakeSupabase } from "./helpers/fake-supabase";

function withEnv<T>(patch: Record<string, string | undefined>, run: () => T): T {
  const previous = Object.fromEntries(
    Object.keys(patch).map((key) => [key, process.env[key]]),
  ) as Record<string, string | undefined>;

  try {
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe("Meta diagnostics", () => {
  test("default Meta scopes include Facebook and Instagram publishing permissions", () => {
    withEnv({ META_SCOPES: undefined }, () => {
      const scopes = getMetaScopes();

      assert.equal(getMissingMetaScopes(scopes).length, 0);
      assert.equal(scopes.includes("pages_manage_posts"), true);
      assert.equal(scopes.includes("instagram_content_publish"), true);
    });
  });

  test("setup diagnostics reports redirect and scope problems without exposing secrets", () => {
    withEnv(
      {
        META_APP_ID: "configured-app-id",
        META_APP_SECRET: "configured-secret",
        META_REDIRECT_URI: "http://localhost:3001/api/meta/callback",
        META_SCOPES: "pages_show_list,instagram_basic",
      },
      () => {
        const diagnostics = buildMetaSetupDiagnostics("http://localhost:3003");

        assert.equal(diagnostics.appIdConfigured, true);
        assert.equal(diagnostics.appSecretConfigured, true);
        assert.equal(diagnostics.redirectMatchesAppUrl, false);
        assert.equal(diagnostics.readyForPublishing, false);
        assert.deepEqual(
          diagnostics.scopes.missing.sort(),
          ["instagram_content_publish", "pages_manage_posts", "pages_read_engagement"].sort(),
        );
        assert.equal(JSON.stringify(diagnostics).includes("configured-secret"), false);
      },
    );
  });

  test("destination discovery explains when Instagram is not linked to an eligible Page", () => {
    const facebookOnly = summarizeMetaDestinationDiscovery(
      [
        {
          platform: "Facebook",
          accountName: "Studio Page",
          accountId: "page-1",
          pageId: "page-1",
          accessToken: "token",
        },
      ],
      "instagram",
    );

    assert.equal(facebookOnly.connectable, false);
    assert.equal(facebookOnly.errorCode, "instagram_not_linked");
    assert.equal(facebookOnly.pagesWithoutInstagram.length, 1);

    const linkedInstagram = summarizeMetaDestinationDiscovery(
      [
        {
          platform: "Facebook",
          accountName: "Studio Page",
          accountId: "page-1",
          pageId: "page-1",
          accessToken: "token",
        },
        {
          platform: "Instagram",
          accountName: "studio",
          accountId: "ig-1",
          pageId: "page-1",
          instagramBusinessAccountId: "ig-1",
          accessToken: "token",
        },
      ],
      "instagram",
    );

    assert.equal(linkedInstagram.connectable, true);
    assert.equal(linkedInstagram.errorCode, null);
    assert.equal(linkedInstagram.pagesWithoutInstagram.length, 0);
  });

  test("connection diagnostics identify linked Meta destinations and publish readiness", async () => {
    const client = createFakeSupabase({
      connected_accounts: [
        {
          id: "fb-1",
          user_id: "user-1",
          platform: "Facebook",
          account_name: "Studio Page",
          account_id: "page-1",
          page_id: "page-1",
          status: "Connected",
          reconnect_required: false,
          access_token: "page-token",
          token_expires_at: null,
        },
        {
          id: "ig-1",
          user_id: "user-1",
          platform: "Instagram",
          account_name: "studio",
          account_id: "ig-1",
          page_id: "page-1",
          instagram_business_account_id: "ig-1",
          status: "Connected",
          reconnect_required: false,
          access_token: "page-token",
          token_expires_at: null,
        },
      ],
    });

    const diagnostics = await buildMetaConnectionDiagnostics(client as never, "user-1");
    const facebook = diagnostics.connections.find((connection) => connection.id === "fb-1");
    const instagram = diagnostics.connections.find((connection) => connection.id === "ig-1");

    assert.equal(facebook?.publishReady, true);
    assert.equal(facebook?.instagramLinkedToPage, true);
    assert.equal(instagram?.publishReady, true);
    assert.deepEqual(diagnostics.summary, {
      facebookConnections: 1,
      instagramConnections: 1,
      publishReadyFacebook: 1,
      publishReadyInstagram: 1,
      pagesWithoutInstagram: 0,
    });
  });
});
