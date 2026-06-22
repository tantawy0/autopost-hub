"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Calendar, Eye, MousePointerClick, Sparkles } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/copied-ui/StatCard";
import { PlatformBadge, PlatformStack } from "@/components/copied-ui/PlatformBadge";
import { ShiningText } from "@/components/copied-ui/effects/ShiningText";
import { SkeletonChart, SkeletonKpiGrid, SkeletonLine, SkeletonPostCard } from "@/components/copied-ui/Skeletons";
import { getAnalyticsDailySeries, getAnalyticsOverview, summarizeAnalytics, type AnalyticsDailyPointDTO, type AnalyticsOverviewDTO } from "@/lib/analytics";
import { listImportedSocialPosts } from "@/lib/social-posts";
import { toUiImportedPost, type UiPlatform } from "@/lib/ui-repo-adapters";
import { useUiStore } from "@/lib/ui-store";
import { formatAppNumber, getPageCopy } from "@/lib/page-copy";

const platforms: UiPlatform[] = ["instagram","facebook","linkedin","tiktok"];

export default function Analytics() {
  const locale = useUiStore((state) => state.locale);
  const copy = getPageCopy(locale);
  const t = copy.analytics;
  const common = copy.common;
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverviewDTO[]>([]);
  const [series, setSeries] = useState<AnalyticsDailyPointDTO[]>([]);
  const [posts, setPosts] = useState<ReturnType<typeof toUiImportedPost>[]>([]);
  const [days, setDays] = useState(14);
  useEffect(() => { void Promise.all([getAnalyticsOverview(), getAnalyticsDailySeries(), listImportedSocialPosts()]).then(([metrics, days, social]) => { setOverview(metrics); setSeries(days); setPosts(social.map(toUiImportedPost)); }).finally(() => setLoading(false)); }, []);
  const summary = useMemo(() => summarizeAnalytics(overview), [overview]);
  const top = useMemo(() => [...posts].sort((a,b) => (b.stats?.reach ?? 0) - (a.stats?.reach ?? 0)).slice(0,4), [posts]);
  const chart = series.slice(-days).map((point) => ({ day: point.metricDate.slice(5), reach: point.reach, engagement: point.engagement }));
  if (loading) return <div className="space-y-6"><div className="space-y-2"><SkeletonLine className="h-8 w-48" /><SkeletonLine className="h-3 w-72" /></div><SkeletonLine className="h-20 w-full rounded-2xl" /><SkeletonKpiGrid count={4} /><div className="grid gap-5 lg:grid-cols-3"><SkeletonChart className="lg:col-span-2" /><div className="glass rounded-2xl p-5 space-y-3"><SkeletonPostCard /><SkeletonPostCard /></div></div></div>;

  return <div className="space-y-6"><div className="flex items-end justify-between flex-wrap gap-3"><div><h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1><p className="text-sm text-muted-foreground">{t.subtitle(days)}</p></div><Button onClick={() => setDays((value) => value === 14 ? 30 : 14)} variant="outline" size="sm" className="border-border"><Calendar className="mr-1.5 h-3.5 w-3.5" /> {t.lastDays(days)}</Button></div>
    <div className="relative overflow-hidden rounded-2xl p-5 border border-accent/30 bg-gradient-to-br from-accent/15 via-card to-card"><div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/30 blur-3xl" /><div className="relative flex items-start gap-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/25 text-accent"><Sparkles className="h-5 w-5" /></div><div className="flex-1"><div className="text-[10px] uppercase tracking-wider text-accent font-bold">{t.aiSummary}</div><h3 className="mt-1 font-display text-lg font-semibold"><ShiningText>{t.aiTitle}</ShiningText></h3><p className="mt-1 text-sm text-muted-foreground">{t.aiBody}</p></div></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label={common.reach} value={formatAppNumber(summary.reach, locale)} icon={Eye} /><StatCard label={common.impressions} value={formatAppNumber(summary.impressions, locale)} icon={Activity} /><StatCard label={common.engagement} value={`${formatAppNumber(summary.engagementRate, locale)}%`} icon={BarChart3} /><StatCard label={common.clicks} value={formatAppNumber(summary.clicks, locale)} icon={MousePointerClick} /></div>
    <div className="grid gap-5 lg:grid-cols-3"><div className="glass rounded-2xl p-5 lg:col-span-2"><div className="font-display text-lg font-semibold mb-4">{t.reachOverTime}</div>{chart.length ? <ResponsiveContainer width="100%" height={260}><AreaChart data={chart}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f9cff" stopOpacity={0.5} /><stop offset="100%" stopColor="#4f9cff" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 14%)" /><XAxis dataKey="day" stroke="#8290a5" fontSize={11} /><YAxis stroke="#8290a5" fontSize={11} /><Tooltip contentStyle={{ background:"#0c111c", border:"1px solid #1b2536", borderRadius:12 }} /><Area type="monotone" dataKey="reach" stroke="#4f9cff" strokeWidth={2} fill="url(#g1)" /></AreaChart></ResponsiveContainer> : <p className="p-12 text-center text-sm text-muted-foreground">{t.syncToFill}</p>}</div><div className="glass rounded-2xl p-5"><div className="font-display text-lg font-semibold mb-4">{t.topPosts}</div><div className="space-y-3">{top.map((post,index) => <div key={post.id} className="flex gap-3"><div className="font-display text-xl font-bold gradient-text w-5">{formatAppNumber(index+1, locale)}</div><div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-sky-500/30 to-cyan-500/25 ring-1 ring-border" /><div className="min-w-0 flex-1"><div className="truncate text-xs">{post.caption}</div><div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground"><PlatformStack platforms={post.platforms} /><span>{formatAppNumber(post.stats?.reach ?? 0, locale)} {common.reach}</span></div></div></div>)}{!top.length ? <p className="text-sm text-muted-foreground">{t.noSyncedPosts}</p> : null}</div></div></div>
    <div className="glass rounded-2xl p-5"><div className="font-display text-lg font-semibold mb-4">{t.platformComparison}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{platforms.map((platform) => { const metric=overview.find((item) => item.platform.toLowerCase()===platform); return <div key={platform} className="rounded-xl border border-border bg-secondary/30 p-4"><PlatformBadge platform={platform} size="md" showName /><div className="mt-3 font-display text-2xl font-bold">{formatAppNumber(metric?.reach ?? 0, locale)}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{common.reach}</div></div>; })}</div></div>
  </div>;
}
