import { getClientUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Platform } from "@/lib/types";

export interface AnalyticsOverviewDTO {
  platform: Platform;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
}

export interface AnalyticsDailyPointDTO {
  metricDate: string;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
}

export interface AnalyticsSummaryDTO {
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  engagementRate: number;
}

type AnalyticsMetricRow = {
  platform?: string | null;
  metric_date?: string | null;
  impressions?: number | null;
  reach?: number | null;
  engagement?: number | null;
  clicks?: number | null;
};

export function summarizeAnalytics(rows: Pick<AnalyticsOverviewDTO, "impressions" | "reach" | "engagement" | "clicks">[]): AnalyticsSummaryDTO {
  const summary = rows.reduce(
    (current, row) => ({
      impressions: current.impressions + Number(row.impressions ?? 0),
      reach: current.reach + Number(row.reach ?? 0),
      engagement: current.engagement + Number(row.engagement ?? 0),
      clicks: current.clicks + Number(row.clicks ?? 0),
    }),
    { impressions: 0, reach: 0, engagement: 0, clicks: 0 },
  );

  return {
    ...summary,
    engagementRate: summary.reach > 0 ? Number(((summary.engagement / summary.reach) * 100).toFixed(1)) : 0,
  };
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverviewDTO[]> {
  const user = await getClientUser();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await supabase
    .from("analytics_daily")
    .select("platform, impressions, reach, engagement, clicks")
    .eq("user_id", user.id)
    .gte("metric_date", since.toISOString().slice(0, 10));

  if (error) {
    return [];
  }

  const totals = new Map<Platform, AnalyticsOverviewDTO>();

  for (const row of data ?? []) {
    const platform = row.platform as Platform;
    const current = totals.get(platform) ?? { platform, impressions: 0, reach: 0, engagement: 0, clicks: 0 };
    current.impressions += Number(row.impressions ?? 0);
    current.reach += Number(row.reach ?? 0);
    current.engagement += Number(row.engagement ?? 0);
    current.clicks += Number(row.clicks ?? 0);
    totals.set(platform, current);
  }

  return [...totals.values()];
}

export async function getAnalyticsDailySeries(days = 14): Promise<AnalyticsDailyPointDTO[]> {
  const user = await getClientUser();
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, days - 1));

  const { data, error } = await supabase
    .from("analytics_daily")
    .select("metric_date, impressions, reach, engagement, clicks")
    .eq("user_id", user.id)
    .gte("metric_date", since.toISOString().slice(0, 10))
    .order("metric_date", { ascending: true });

  if (error) return [];

  const totals = new Map<string, AnalyticsDailyPointDTO>();

  for (const row of (data ?? []) as AnalyticsMetricRow[]) {
    if (!row.metric_date) continue;

    const current = totals.get(row.metric_date) ?? {
      metricDate: row.metric_date,
      impressions: 0,
      reach: 0,
      engagement: 0,
      clicks: 0,
    };
    current.impressions += Number(row.impressions ?? 0);
    current.reach += Number(row.reach ?? 0);
    current.engagement += Number(row.engagement ?? 0);
    current.clicks += Number(row.clicks ?? 0);
    totals.set(row.metric_date, current);
  }

  return [...totals.values()];
}
