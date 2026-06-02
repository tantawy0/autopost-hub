import { CalendarClock, CheckCircle2, FileText, Layers3, Send, TriangleAlert } from "lucide-react";

import MetricCard from "@/components/dashboard/MetricCard";
import type { DashboardSummaryDTO } from "@/lib/types";

interface DashboardCountsProps {
  counts: DashboardSummaryDTO["counts"];
}

export default function DashboardCounts({ counts }: DashboardCountsProps) {
  const issueCount = counts.partiallyPublishedPosts + counts.failedPosts;

  return (
    <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <MetricCard label="Library" value={counts.totalPosts} icon={Send} tone="emerald" helper="All saved content" />
      <MetricCard label="Drafts" value={counts.draftPosts} icon={FileText} tone="amber" helper="Needs a schedule" />
      <MetricCard label="Scheduled" value={counts.scheduledPosts} icon={CalendarClock} tone="sky" helper="Queued posts" />
      <MetricCard label="Published" value={counts.publishedPosts} icon={CheckCircle2} tone="emerald" helper="Succeeded posts" />
      <MetricCard label="Watchlist" value={issueCount} icon={TriangleAlert} tone="rose" helper="Partial or failed" />
      <MetricCard label="Channels" value={counts.connectedChannels} icon={Layers3} tone="violet" helper="Connected now" />
    </section>
  );
}
