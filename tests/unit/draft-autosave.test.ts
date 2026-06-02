import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

import { toPostCardDTO } from "../../lib/posts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("draft autosave persistence", () => {
  test("normalizes persisted draft rows without dropping creator metadata", () => {
    const draft = toPostCardDTO({
      id: "draft-1",
      caption: "Quiet launch idea",
      first_comment: "Drop a question in the comments.",
      image_url: "https://example.test/media.png",
      platforms: ["instagram", "TikTok", "instagram"],
      status: "draft",
      scheduled_for: null,
      internal_notes: "Keep this one short-form first.",
      post_format: "Reel",
      approval_requested: true,
      approval_status: "Changes Requested",
      created_at: "2026-05-25T10:00:00.000Z",
      updated_at: "2026-05-25T10:01:00.000Z",
    });

    assert.equal(draft.status, "Draft");
    assert.equal(draft.scheduledFor, null);
    assert.deepEqual(draft.platforms, ["Instagram", "TikTok"]);
    assert.equal(draft.internalNotes, "Keep this one short-form first.");
    assert.equal(draft.postFormat, "Reel");
    assert.equal(draft.approvalRequested, true);
    assert.equal(draft.approvalStatus, "Changes Requested");
    assert.equal(draft.media[0]?.url, "https://example.test/media.png");
  });

  test("autosave API uses a versioned user-scoped upsert contract", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, "app", "api", "posts", "autosave", "route.ts"),
      "utf8",
    );

    assert.match(source, /requireAuthenticatedUser/);
    assert.match(source, /requireWorkspacePermission\(client,\s*user,\s*"content_edit"/);
    assert.match(source, /\.from\("draft_autosaves"\)/);
    assert.match(source, /\.eq\("user_id",\s*user\.id\)/);
    assert.match(source, /\.eq\("client_draft_id",\s*clientDraftId\)/);
    assert.match(source, /const version\s*=\s*Number\(/);
    assert.match(source, /\?\.version\s*\?\?\s*0\)\s*\+\s*1/);
    assert.match(source, /workspace_id:\s*workspace\.workspaceId/);
    assert.match(source, /user_id:\s*user\.id/);
    assert.match(source, /payload:\s*body\.payload\s*\?\?\s*\{\}/);
    assert.match(source, /onConflict:\s*"user_id,client_draft_id"/);
  });
});
