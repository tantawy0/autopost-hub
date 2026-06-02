import "server-only";

import { createHash } from "crypto";

import type { BackgroundJobType } from "@/lib/server/jobs/types";

export function buildJobIdempotencyKey(
  jobType: BackgroundJobType,
  parts: Record<string, string | number | null | undefined>,
): string {
  const canonical = Object.keys(parts)
    .sort()
    .map((key) => `${key}=${parts[key] ?? ""}`)
    .join("|");
  const digest = createHash("sha256")
    .update(`${jobType}:${canonical}`)
    .digest("hex")
    .slice(0, 32);

  return `${jobType}:${digest}`;
}

export function publishPostIdempotencyKey(postId: string): string {
  return buildJobIdempotencyKey("publish_post", { postId });
}

export function analyticsIngestIdempotencyKey(
  userId: string,
  platform: string,
  metricDate: string,
): string {
  return buildJobIdempotencyKey("analytics_ingest", { userId, platform, metricDate });
}

export function tokenRefreshIdempotencyKey(connectedAccountId: string): string {
  return buildJobIdempotencyKey("token_refresh", { connectedAccountId });
}

export function socialSyncIdempotencyKey(connectedAccountId: string): string {
  return buildJobIdempotencyKey("social_sync", { connectedAccountId });
}
