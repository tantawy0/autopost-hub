import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { publishPost } from "../../lib/publishing";
import {
  isTerminalPostStatus,
  normalizePlatform,
  normalizePostStatus,
} from "../../lib/types";
import { validateStatusTransition } from "../../lib/validation/scheduling";
import { createFakeSupabase } from "./helpers/fake-supabase";

describe("publish lifecycle status transitions", () => {
  test("marks a scheduled post as failed when every destination attempt fails", async () => {
    const client = createFakeSupabase({
      posts: [
        {
          id: "post-1",
          user_id: "user-1",
          workspace_id: "workspace-1",
          caption: "Launch note",
          first_comment: "",
          image_url: null,
          platforms: ["Facebook"],
          status: "Scheduled",
        },
      ],
      connected_accounts: [
        {
          id: "account-1",
          user_id: "user-1",
          workspace_id: "workspace-1",
          platform: "Facebook",
          account_name: "Creator Page",
          account_id: "page-1",
          status: "Connected",
          reconnect_required: false,
          access_token: null,
        },
      ],
      publishing_attempts: [],
      activity_events: [],
      audit_logs: [],
    });

    const result = await publishPost(client as never, {
      postId: "post-1",
      userId: "user-1",
    });

    assert.equal(result.status, "Failed");
    assert.equal(result.attempts.length, 1);
    assert.equal(result.attempts[0].status, "Failed");
    assert.equal(client.tables.posts[0].status, "Failed");
    assert.equal(client.tables.posts[0].lifecycle_status, "failed");
    assert.equal(client.tables.publishing_attempts.length, 1);
    assert.equal(client.tables.activity_events[0].event_type, "post.publish_completed");
    assert.equal(client.tables.audit_logs[0].action, "post.publish");
  });

  test("blocks republishing once a post has reached a terminal state", async () => {
    const client = createFakeSupabase({
      posts: [
        {
          id: "post-2",
          user_id: "user-1",
          workspace_id: "workspace-1",
          platforms: ["Instagram"],
          status: "Published",
        },
      ],
      connected_accounts: [],
      publishing_attempts: [],
      audit_logs: [],
    });

    await assert.rejects(
      () => publishPost(client as never, { postId: "post-2", userId: "user-1" }),
      /terminal publishing state/,
    );

    assert.equal(client.tables.publishing_attempts.length, 0);
    assert.equal(client.tables.posts[0].status, "Published");
  });

  test("normalizes terminal lifecycle statuses used by route guards", () => {
    assert.equal(isTerminalPostStatus(normalizePostStatus("Published")), true);
    assert.equal(isTerminalPostStatus(normalizePostStatus("partially_published")), true);
    assert.equal(isTerminalPostStatus(normalizePostStatus("Failed")), true);
    assert.equal(isTerminalPostStatus(normalizePostStatus("Scheduled")), false);

    assert.match(
      validateStatusTransition("Published", "Scheduled") ?? "",
      /terminal/,
    );
    assert.match(
      validateStatusTransition("Partially Published", "Scheduled") ?? "",
      /terminal/,
    );
  });

  test("normalizes LinkedIn platform labels for provider routing", () => {
    assert.equal(normalizePlatform("LinkedIn"), "LinkedIn");
    assert.equal(normalizePlatform("linked in"), "LinkedIn");
  });
});
