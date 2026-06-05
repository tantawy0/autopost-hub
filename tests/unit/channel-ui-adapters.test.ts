import test from "node:test";
import assert from "node:assert/strict";

import { toUiChannel } from "@/lib/ui-repo-adapters";
import type { ConnectedAccountDTO } from "@/lib/types";

test("channel UI marks reconnect-required accounts as errors even if provider status says connected", () => {
  const account: ConnectedAccountDTO = {
    id: "account-1",
    platform: "Facebook",
    accountName: "Creator Page",
    status: "Connected",
    reconnectRequired: true,
    publishCapable: false,
  };

  const uiChannel = toUiChannel(account);

  assert.equal(uiChannel.status, "error");
  assert.equal(uiChannel.tokenHealth, 0);
  assert.equal(
    uiChannel.permissions.find((permission) => /publish|manage/i.test(permission.name))?.granted,
    false,
  );
});
