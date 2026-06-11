import test from "node:test";
import assert from "node:assert/strict";

import { savePostForUser } from "@/lib/server/posts/service";
import { createFakeSupabase } from "./helpers/fake-supabase";

test("saving a post stores only the explicitly selected destination accounts", async () => {
  const client = createFakeSupabase({
    connected_accounts: [
      {
        id: "page-1",
        user_id: "user-1",
        workspace_id: "workspace-1",
        platform: "Facebook",
        account_name: "Selected Page",
        status: "Connected",
        reconnect_required: false,
      },
      {
        id: "page-2",
        user_id: "user-1",
        workspace_id: "workspace-1",
        platform: "Facebook",
        account_name: "Unselected Page",
        status: "Connected",
        reconnect_required: false,
      },
    ],
  });

  const saved = await savePostForUser(client as never, {
    user: { id: "user-1" } as never,
    workspace: { workspaceId: "workspace-1", userId: "user-1", role: "Owner" },
    post: {
      caption: "Destination selection regression test",
      firstComment: "",
      imageUrl: null,
      platforms: ["Facebook"],
      destinationAccountIds: ["page-1"],
      status: "Draft",
      scheduledFor: null,
    },
  });

  assert.equal(saved.caption, "Destination selection regression test");
  assert.deepEqual(
    client.tables.post_destinations.map((row) => row.connected_account_id),
    ["page-1"],
  );
});
