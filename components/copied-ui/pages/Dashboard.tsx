"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, CalendarDays, Check, Eye, FileText, Heart, MessageCircle, Plug, Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "@/components/copied-ui/StatCard";
import { PlatformBadge, PlatformStack } from "@/components/copied-ui/PlatformBadge";
import { StatusChip } from "@/components/copied-ui/StatusChip";
import { ButtonWithBadge } from "@/components/copied-ui/effects/ButtonWithBadge";
import { ShiningText } from "@/components/copied-ui/effects/ShiningText";
import { SkeletonChannelGrid, SkeletonKpiGrid, SkeletonPostCard } from "@/components/copied-ui/Skeletons";
import { getDashboardSummary } from "@/lib/posts";
import { toUiChannel, toUiPost, type UiPost } from "@/lib/ui-repo-adapters";
import type { DashboardSummaryDTO } from "@/lib/types";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void getDashboardSummary().then(setSummary).catch(() => { setLoading(false); }).finally(() => setLoading(false)); }, []);
  if (loading || !summary) return <div className="space-y-6"><div className="space-y-2"><div className="h-3 w-32 rounded bg-secondary/60 animate-pulse" /><div className="h-8 w-72 rounded bg-secondary/60 animate-pulse" /></div><SkeletonKpiGrid /><div className="grid gap-3 lg:grid-cols-2"><SkeletonPostCard /><SkeletonPostCard /></div><SkeletonChannelGrid /></div>;

  const todays = summary.scheduledQueue.map(toUiPost).slice(0, 4);
  const best = summary.recentPublished.map(toUiPost).find((post) => post.status === "published");
  const channels = summary.connectedChannels.map(toUiChannel);
  const checklist = [
    { label: "Connect your first channel", done: summary.counts.connectedChannels > 0 },
    { label: "Create your first post", done: summary.counts.totalPosts > 0 },
    { label: "Schedule a week of content", done: summary.counts.scheduledPosts >= 3 },
    { label: "Review your first analytics report", done: summary.counts.publishedPosts > 0 },
  ];
  const complete = checklist.filter((item) => item.done).length;
  const progress = Math.round((complete / checklist.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div><div className="text-xs uppercase tracking-wider text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</div><h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Creator command center</h1><p className="text-sm text-muted-foreground">You have <span className="text-foreground font-semibold">{summary.counts.scheduledPosts} posts</span> scheduled across {summary.counts.connectedChannels} channels.</p></div>
        <Link href="/create"><ButtonWithBadge variant="primary" badge="AI" badgeVariant="default" size="lg">New post <ArrowRight className="h-4 w-4" /></ButtonWithBadge></Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Scheduled posts" value={summary.counts.scheduledPosts} icon={CalendarDays} hint="publishing queue" />
        <StatCard label="Published" value={summary.counts.publishedPosts} icon={Send} hint="completed outcomes" />
        <StatCard label="Drafts" value={summary.counts.draftPosts} icon={FileText} hint="stored ideas" />
        <StatCard label="Connected channels" value={summary.counts.connectedChannels} icon={Plug} hint="live destinations" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between"><div><div className="font-display text-lg font-semibold">Getting started</div><p className="text-sm text-muted-foreground">{complete} of {checklist.length} steps complete</p></div><div className="font-display text-2xl font-bold gradient-text">{progress}%</div></div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary"><motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:0.8}} className="h-full bg-gradient-primary" /></div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">{checklist.map((item) => <div key={item.label} className={`flex items-center gap-3 rounded-xl border p-3 ${item.done ? "border-success/20 bg-success/5" : "border-border bg-secondary/30"}`}><div className={`grid h-7 w-7 place-items-center rounded-lg ${item.done ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground"}`}><Check className="h-3.5 w-3.5" /></div><span className={`text-sm ${item.done ? "line-through text-muted-foreground" : "font-medium"}`}>{item.label}</span></div>)}</div>
        </motion.div>
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="relative overflow-hidden rounded-2xl p-5 border border-accent/30 bg-gradient-to-br from-accent/15 via-card to-card"><div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/30 blur-3xl" /><div className="relative"><div className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent"><Sparkles className="h-3 w-3" /> AI insight</div><h3 className="mt-3 font-display text-lg font-semibold leading-snug"><ShiningText>{summary.counts.scheduledPosts ? "Your publishing queue is healthy." : "Your next publishing window is open."}</ShiningText></h3><p className="mt-1.5 text-sm text-muted-foreground">Ask Creator AI to shape the next content move from your real workspace state.</p><Link href="/ai-agent" className="mt-4 inline-flex rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground">Ask AI</Link></div></motion.div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2"><div className="flex items-center justify-between mb-4"><div className="font-display text-lg font-semibold">Today&apos;s queue</div><Link href="/queue" className="text-xs text-primary hover:underline">View all</Link></div><div className="space-y-2">{todays.length ? todays.map((post) => <QueueRow key={post.id} post={post} />) : <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No scheduled posts yet.</p>}</div></div>
        <div className="glass rounded-2xl p-5"><div className="flex items-center justify-between mb-3"><div className="font-display text-lg font-semibold">Top post</div><span className="text-[10px] uppercase tracking-wider text-success font-semibold">performance</span></div>{best ? <><div className="aspect-video rounded-xl bg-gradient-to-br from-sky-500/30 via-cyan-500/25 to-indigo-500/25 ring-grid" /><p className="mt-3 text-sm">{best.caption}</p><div className="mt-2"><PlatformStack platforms={best.platforms} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><MiniStat icon={Eye} label="Reach" value={best.stats?.reach} /><MiniStat icon={Heart} label="Engage" value={best.stats?.engagement} /><MiniStat icon={MessageCircle} label="Clicks" value={best.stats?.clicks} /></div></> : <p className="text-sm text-muted-foreground">Published outcomes appear here.</p>}</div>
      </div>
      <div><div className="mb-3 flex items-center justify-between"><div className="font-display text-lg font-semibold">Channel health</div><Link href="/channels" className="text-xs text-primary hover:underline">Manage</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{channels.length ? channels.map((channel) => <Link href="/channels" key={channel.id} className="glass gradient-border rounded-xl p-3 hover-lift"><div className="flex items-center justify-between"><PlatformBadge platform={channel.platform} size="md" /><span className={`h-2 w-2 rounded-full ${channel.status === "healthy" ? "bg-success" : "bg-warning"}`} /></div><div className="mt-3 truncate text-xs font-semibold">{channel.handle}</div><div className="text-[10px] text-muted-foreground">{channel.status === "healthy" ? "Publishing ready" : "Needs attention"}</div></Link>) : <Link href="/channels" className="glass rounded-xl p-4 text-sm text-muted-foreground">Connect a channel</Link>}</div></div>
    </div>
  );
}

function QueueRow({ post }: { post: UiPost }) {
  return <Link href={`/edit-post/${post.id}`} className="group flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3 hover:bg-secondary/60 transition"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-primary/20 text-xs font-bold text-primary">{format(new Date(post.scheduledAt), "HH:mm")}</div><div className="flex-1 min-w-0"><div className="truncate text-sm">{post.caption}</div><div className="mt-1"><PlatformStack platforms={post.platforms} /></div></div><StatusChip status={post.status} /></Link>;
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value?: string | number | null }) {
  return <div className="rounded-lg bg-secondary/40 p-2"><Icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" /><div className="mt-1 text-sm font-bold">{value ?? "Synced"}</div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div></div>;
}
