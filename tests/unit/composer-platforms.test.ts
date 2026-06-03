import test from "node:test";
import assert from "node:assert/strict";

import {
  getActivePreviewPlatform,
  getComposerPreviewPlatforms,
  getUniqueDestinationPlatforms,
} from "@/lib/composer-platforms";
import type { ConnectedAccountDTO, Platform } from "@/lib/types";

function account(id: string, platform: Platform): ConnectedAccountDTO {
  return {
    id,
    platform,
    accountName: `${platform} ${id}`,
    status: "Connected",
    reconnectRequired: false,
    publishCapable: true,
  };
}

test("composer stores unique platform names while keeping multiple destinations publishable", () => {
  const selected = [
    account("page-1", "Facebook"),
    account("page-2", "Facebook"),
    account("page-3", "Facebook"),
  ];

  assert.deepEqual(getUniqueDestinationPlatforms(selected), ["Facebook"]);
});

test("composer preview tabs only include selected connected destination platforms", () => {
  const selected = [account("page-1", "Facebook")];

  assert.deepEqual(getComposerPreviewPlatforms(selected), ["facebook"]);
  assert.equal(getActivePreviewPlatform("instagram", ["facebook"]), "facebook");
});

test("composer preview has no active platform when every destination is deselected", () => {
  assert.deepEqual(getComposerPreviewPlatforms([]), []);
  assert.equal(getActivePreviewPlatform("instagram", []), null);
});
