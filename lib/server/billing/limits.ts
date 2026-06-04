import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPlanDefinition,
  type PlanDefinition,
  type PlanKey,
  type PlanLimits,
} from "@/lib/billing/plans";

export type PlanLimitMetric =
  | "channels"
  | "scheduledPostsMonthly"
  | "aiRequestsMonthly"
  | "mediaStorageMb"
  | "teamMembers";

type UsageByMetric = Record<PlanLimitMetric, number>;

type WorkspaceSubscriptionLimitRow = {
  plan_key?: PlanKey | null;
  status?: string | null;
};

export class PlanLimitError extends Error {
  code = "plan_limit_exceeded";
  status = 402;

  constructor(
    public readonly metric: PlanLimitMetric,
    public readonly plan: PlanDefinition,
    public readonly limit: number,
    public readonly used: number,
  ) {
    super(`${plan.name} plan ${describeMetric(metric)} limit reached. Upgrade to continue.`);
    this.name = "PlanLimitError";
  }
}

function describeMetric(metric: PlanLimitMetric) {
  switch (metric) {
    case "channels":
      return "connected channel";
    case "scheduledPostsMonthly":
      return "scheduled posts";
    case "aiRequestsMonthly":
      return "AI requests";
    case "mediaStorageMb":
      return "media storage";
    case "teamMembers":
      return "team member";
  }
}

function firstDayOfMonthIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}

function isMissingBillingTable(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && /workspace_subscriptions|schema cache|does not exist/i.test(error.message));
}

function limitForMetric(limits: PlanLimits, metric: PlanLimitMetric) {
  return limits[metric];
}

async function listRows(
  query: PromiseLike<{ data: Array<Record<string, unknown>> | null; error: { message?: string } | null }>,
) {
  const { data, error } = await query;

  if (error) {
    if (/relation .*|schema cache|does not exist/i.test(error.message ?? "")) return [];
    throw new Error(error.message ?? "Unable to read plan usage.");
  }

  return data ?? [];
}

export async function getWorkspacePlan(
  client: SupabaseClient,
  workspaceId: string,
): Promise<PlanDefinition> {
  const { data, error } = await client
    .from("workspace_subscriptions")
    .select("plan_key, status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (isMissingBillingTable(error)) return getPlanDefinition("free");
  if (error) throw new Error(error.message);

  const row = data as WorkspaceSubscriptionLimitRow | null;
  const status = row?.status ?? "free";

  if (status === "canceled" || status === "incomplete_expired") {
    return getPlanDefinition("free");
  }

  return getPlanDefinition(row?.plan_key);
}

export async function getPlanUsage(
  client: SupabaseClient,
  workspaceId: string,
  now = new Date(),
): Promise<UsageByMetric> {
  const monthStart = firstDayOfMonthIso(now);
  const [channels, scheduledPosts, aiRequests, mediaAssets, members] = await Promise.all([
    listRows(
      client
        .from("connected_accounts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("status", "Connected")
        .eq("reconnect_required", false),
    ),
    listRows(
      client
        .from("posts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("status", "Scheduled")
        .gte("created_at", monthStart),
    ),
    listRows(
      client
        .from("ai_usage_events")
        .select("id")
        .eq("workspace_id", workspaceId)
        .gte("created_at", monthStart),
    ),
    listRows(
      client
        .from("media_assets")
        .select("size_bytes")
        .eq("workspace_id", workspaceId),
    ),
    listRows(
      client
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId),
    ),
  ]);

  const mediaStorageMb = mediaAssets.reduce((total, row) => {
    const size = typeof row.size_bytes === "number" ? row.size_bytes : 0;
    return total + size / 1024 / 1024;
  }, 0);

  return {
    channels: channels.length,
    scheduledPostsMonthly: scheduledPosts.length,
    aiRequestsMonthly: aiRequests.length,
    mediaStorageMb,
    teamMembers: members.length,
  };
}

export async function assertPlanCapacity(
  client: SupabaseClient,
  input: {
    workspaceId: string;
    metric: PlanLimitMetric;
    increment?: number;
    now?: Date;
  },
) {
  const increment = input.increment ?? 1;
  const plan = await getWorkspacePlan(client, input.workspaceId);
  const limit = limitForMetric(plan.limits, input.metric);

  if (limit === null) return { plan, used: 0, limit };

  const usage = await getPlanUsage(client, input.workspaceId, input.now);
  const used = usage[input.metric];

  if (used + increment > limit) {
    throw new PlanLimitError(input.metric, plan, limit, used);
  }

  return { plan, used, limit };
}

async function listExistingConnectedAccounts(
  client: SupabaseClient,
  input: {
    workspaceId: string;
    platform: string;
    accountIds?: string[];
  },
) {
  let query = client
    .from("connected_accounts")
    .select("id, account_id")
    .eq("workspace_id", input.workspaceId)
    .eq("platform", input.platform);

  if (input.accountIds && input.accountIds.length > 0) {
    query = query.in("account_id", input.accountIds);
  }

  const { data, error } = await query;

  if (error) {
    if (/relation .*connected_accounts|schema cache|does not exist/i.test(error.message ?? "")) return [];
    throw new Error(error.message ?? "Unable to read connected channels.");
  }

  return data ?? [];
}

export async function assertOAuthStartCapacity(
  client: SupabaseClient,
  input: {
    workspaceId: string;
    platform: string;
  },
) {
  const existing = await listExistingConnectedAccounts(client, {
    workspaceId: input.workspaceId,
    platform: input.platform,
  });

  if (existing.length > 0) {
    return { reconnectingExistingPlatform: true };
  }

  await assertPlanCapacity(client, {
    workspaceId: input.workspaceId,
    metric: "channels",
  });

  return { reconnectingExistingPlatform: false };
}

export async function assertDiscoveredChannelCapacity(
  client: SupabaseClient,
  input: {
    workspaceId: string;
    destinations: Array<{ platform: string; accountId: string }>;
  },
) {
  const destinations = input.destinations.filter((destination) => destination.accountId);

  if (destinations.length === 0) {
    return { newDestinations: 0 };
  }

  const existingKeys = new Set<string>();
  const platforms = Array.from(new Set(destinations.map((destination) => destination.platform)));

  for (const platform of platforms) {
    const accountIds = destinations
      .filter((destination) => destination.platform === platform)
      .map((destination) => destination.accountId);
    const existing = await listExistingConnectedAccounts(client, {
      workspaceId: input.workspaceId,
      platform,
      accountIds,
    });

    for (const row of existing) {
      existingKeys.add(`${platform}:${row.account_id}`);
    }
  }

  const newDestinations = destinations.filter(
    (destination) => !existingKeys.has(`${destination.platform}:${destination.accountId}`),
  ).length;

  if (newDestinations > 0) {
    await assertPlanCapacity(client, {
      workspaceId: input.workspaceId,
      metric: "channels",
      increment: newDestinations,
    });
  }

  return { newDestinations };
}
