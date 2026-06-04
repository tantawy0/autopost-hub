import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getAgentSetupHint, getErrorMessage } from "../../lib/agent-errors";

describe("agent error safety", () => {
  test("redacts provider secret names and secret-shaped values", () => {
    const fakeProviderKey = ["sk", "or-v1", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
    const message = getErrorMessage(
      new Error(`API_KEY_21ST rejected ${fakeProviderKey}`),
    );

    assert.equal(message.includes("API_KEY_21ST"), false);
    assert.equal(message.includes("sk-or-v1-"), false);
  });

  test("setup hints do not expose exact server env names", () => {
    const hint = getAgentSetupHint("invalid api key");

    assert.equal(hint.includes("API_KEY_21ST"), false);
    assert.match(hint, /server-side 21st token/i);
  });
});
