import "server-only";

import { createHash } from "crypto";

import { AnalyticsErrorCode, AnalyticsException } from "@/lib/server/analytics-errors";

const SUPPORTED_PLATFORMS = new Set(["Facebook", "Instagram", "TikTok", "LinkedIn"]);

export type NormalizedPlatformMetrics = {
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
};

export function normalizePlatformMetrics(input: {
  impressions?: number;
  reach?: number;
  engagement?: number;
  clicks?: number;
}): NormalizedPlatformMetrics {
  return {
    impressions: Math.max(0, Number(input.impressions ?? 0)),
    reach: Math.max(0, Number(input.reach ?? 0)),
    engagement: Math.max(0, Number(input.engagement ?? 0)),
    clicks: Math.max(0, Number(input.clicks ?? 0)),
  };
}

export function assertValidAnalyticsPlatform(platform: string): void {
  if (!SUPPORTED_PLATFORMS.has(platform)) {
    throw new AnalyticsException(
      AnalyticsErrorCode.INVALID_PLATFORM,
      `Unsupported analytics platform: ${platform}`,
      { retryable: false },
    );
  }
}

export function assertValidMetricDate(metricDate: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metricDate)) {
    throw new AnalyticsException(
      AnalyticsErrorCode.INVALID_METRIC_DATE,
      "metricDate must use YYYY-MM-DD format.",
      { retryable: false },
    );
  }

  const parsed = new Date(`${metricDate}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new AnalyticsException(
      AnalyticsErrorCode.INVALID_METRIC_DATE,
      "metricDate is not a valid calendar date.",
      { retryable: false },
    );
  }
}

export function buildMetricsPayloadHash(metrics: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(metrics)).digest("hex").slice(0, 32);
}

export type PostMetricSnapshotInput = {
  likes?: number | null;
  comments?: number | null;
  reactions?: number | null;
  engagementRate?: number | null;
  views?: number | null;
  reach?: number | null;
  shares?: number | null;
  saves?: number | null;
};

export function normalizePostMetricSnapshot(metrics: PostMetricSnapshotInput): Record<string, number | null> {
  const engagementRate =
    metrics.engagementRate === null || metrics.engagementRate === undefined
      ? null
      : Number(metrics.engagementRate);

  return {
    likes: metrics.likes ?? null,
    comments: metrics.comments ?? null,
    reactions: metrics.reactions ?? null,
    engagementRate: Number.isFinite(engagementRate) ? engagementRate : null,
    views: metrics.views ?? null,
    reach: metrics.reach ?? null,
    shares: metrics.shares ?? null,
    saves: metrics.saves ?? null,
  };
}
