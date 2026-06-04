import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  PlanLimitError,
  assertDiscoveredChannelCapacity,
  assertOAuthStartCapacity,
  assertPlanCapacity,
  getPlanUsage,
  getWorkspacePlan,
} from "@/lib/server/billing/limits";
import { createFakeSupabase } from "./helpers/fake-supabase";

describe("billing plan limits", () => {
  test("defaults missing subscription rows to the Free plan", async () => {
    const client = createFakeSupabase({
      workspace_subscriptions: [],
    });

    const plan = await getWorkspacePlan(client as never, "workspace-1");

    assert.equal(plan.key, "free");
  });

  test("blocks additional connected channels when the Free plan limit is reached", async () => {
    const client = createFakeSupabase({
      workspace_subscriptions: [
        { workspace_id: "workspace-1", plan_key: "free", status: "free" },
      ],
      connected_accounts: [
        {
          id: "account-1",
          workspace_id: "workspace-1",
          status: "Connected",
          reconnect_required: false,
        },
      ],
      posts: [],
      ai_usage_events: [],
      media_assets: [],
      workspace_members: [{ workspace_id: "workspace-1", user_id: "user-1" }],
    });

    await assert.rejects(
      () => assertPlanCapacity(client as never, { workspaceId: "workspace-1", metric: "channels" }),
      (error) => {
        assert.ok(error instanceof PlanLimitError);
        assert.equal(error.code, "plan_limit_exceeded");
        assert.equal(error.status, 402);
        assert.equal(error.metric, "channels");
        return true;
      },
    );
  });

  test("allows OAuth reconnect for an existing platform even when active channel limit is reached", async () => {
    const client = createFakeSupabase({
      workspace_subscriptions: [
        { workspace_id: "workspace-1", plan_key: "free", status: "free" },
      ],
      connected_accounts: [
        {
          id: "active-facebook",
          workspace_id: "workspace-1",
          platform: "Facebook",
          account_id: "page-1",
          status: "Connected",
          reconnect_required: false,
        },
        {
          id: "reauth-instagram",
          workspace_id: "workspace-1",
          platform: "Instagram",
          account_id: "ig-1",
          status: "Connected",
          reconnect_required: true,
        },
      ],
      posts: [],
      ai_usage_events: [],
      media_assets: [],
      workspace_members: [{ workspace_id: "workspace-1", user_id: "user-1" }],
    });

    await assert.doesNotReject(() =>
      assertOAuthStartCapacity(client as never, {
        workspaceId: "workspace-1",
        platform: "Instagram",
      }),
    );
  });

  test("counts only brand-new discovered OAuth destinations against channel capacity", async () => {
    const client = createFakeSupabase({
      workspace_subscriptions: [
        { workspace_id: "workspace-1", plan_key: "free", status: "free" },
      ],
      connected_accounts: [
        {
          id: "active-facebook",
          workspace_id: "workspace-1",
          platform: "Facebook",
          account_id: "page-1",
          status: "Connected",
          reconnect_required: false,
        },
        {
          id: "reauth-instagram",
          workspace_id: "workspace-1",
          platform: "Instagram",
          account_id: "ig-1",
          status: "Connected",
          reconnect_required: true,
        },
      ],
      posts: [],
      ai_usage_events: [],
      media_assets: [],
      workspace_members: [{ workspace_id: "workspace-1", user_id: "user-1" }],
    });

    await assert.doesNotReject(() =>
      assertDiscoveredChannelCapacity(client as never, {
        workspaceId: "workspace-1",
        destinations: [{ platform: "Instagram", accountId: "ig-1" }],
      }),
    );
    await assert.rejects(
      () =>
        assertDiscoveredChannelCapacity(client as never, {
          workspaceId: "workspace-1",
          destinations: [{ platform: "Instagram", accountId: "ig-2" }],
        }),
      PlanLimitError,
    );
  });

  test("blocks monthly AI usage once the plan limit is reached", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const usageRows = Array.from({ length: 25 }, (_, index) => ({
      id: `usage-${index}`,
      workspace_id: "workspace-1",
      created_at: "2026-06-03T00:00:00.000Z",
    }));
    const client = createFakeSupabase({
      workspace_subscriptions: [
        { workspace_id: "workspace-1", plan_key: "free", status: "free" },
      ],
      connected_accounts: [],
      posts: [],
      ai_usage_events: usageRows,
      media_assets: [],
      workspace_members: [{ workspace_id: "workspace-1", user_id: "user-1" }],
    });

    await assert.rejects(
      () =>
        assertPlanCapacity(client as never, {
          workspaceId: "workspace-1",
          metric: "aiRequestsMonthly",
          now,
        }),
      PlanLimitError,
    );
  });

  test("calculates usage and allows unlimited scheduled posts on Pro", async () => {
    const client = createFakeSupabase({
      workspace_subscriptions: [
        { workspace_id: "workspace-1", plan_key: "pro", status: "active" },
      ],
      connected_accounts: [],
      posts: Array.from({ length: 40 }, (_, index) => ({
        id: `post-${index}`,
        workspace_id: "workspace-1",
        status: "Scheduled",
        created_at: "2026-06-03T00:00:00.000Z",
      })),
      ai_usage_events: [],
      media_assets: [
        { workspace_id: "workspace-1", size_bytes: 1024 * 1024 * 2 },
        { workspace_id: "workspace-1", size_bytes: 1024 * 512 },
      ],
      workspace_members: [
        { workspace_id: "workspace-1", user_id: "user-1" },
        { workspace_id: "workspace-1", user_id: "user-2" },
      ],
    });

    const usage = await getPlanUsage(client as never, "workspace-1", new Date("2026-06-10T00:00:00.000Z"));

    assert.equal(usage.scheduledPostsMonthly, 40);
    assert.equal(usage.mediaStorageMb, 2.5);
    assert.equal(usage.teamMembers, 2);
    await assert.doesNotReject(() =>
      assertPlanCapacity(client as never, {
        workspaceId: "workspace-1",
        metric: "scheduledPostsMonthly",
      }),
    );
  });
});
