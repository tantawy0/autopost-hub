"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Grid2X2,
  Image as ImageIcon,
  List,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import MediaPreview from "@/components/posts/MediaPreview";
import SocialPostCard from "@/components/posts/SocialPostCard";
import StatusPill from "@/components/ui/StatusPill";
import { AnimatedNumber, RevealItem, StaggerReveal, ViewportReveal } from "@/components/ui/SilentMotion";
import { listImportedSocialPosts } from "@/lib/social-posts";
import type { DashboardSummaryDTO, PostCardDTO, SocialPostDTO } from "@/lib/types";

interface PublishWorkspaceProps {
  summary: DashboardSummaryDTO;
}

type BoardTab = "Queue" | "Drafts" | "Approvals" | "Sent";

const TABS: BoardTab[] = ["Queue", "Drafts", "Approvals", "Sent"];

function formatSlot(value: string | null) {
  if (!value) return "No time selected";

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function setupItems(summary: DashboardSummaryDTO) {
  return [
    {
      label: "Create your workspace",
      complete: true,
      href: "/",
    },
    {
      label: "Connect your first channel",
      complete: summary.counts.connectedChannels > 0,
      href: "/channels",
    },
    {
      label: "Capture a short-form idea",
      complete: summary.counts.draftPosts > 0 || summary.counts.totalPosts > 0,
      href: "/create-post",
    },
    {
      label: "Ship the first post",
      complete: summary.counts.publishedPosts > 0,
      href: "/create-post",
    },
  ];
}

function SoftNotice({ summary }: { summary: DashboardSummaryDTO }) {
  const hasIssues = summary.counts.failedPosts + summary.counts.partiallyPublishedPosts > 0;

  return (
    <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
      <div className="glass-card rounded-2xl px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#bde5ad]/12 text-[#d8ffd0]">
            <ShieldCheck size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-white">Provider readiness is quiet until it needs attention.</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Meta credentials and account status still control live publishing, but warnings stay grouped here instead of taking over the screen.
            </p>
          </div>
        </div>
      </div>
      <Link
        href={hasIssues ? "/published" : "/channels"}
        className="glass-card inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black text-white transition hover:text-[#d8ffd0]"
      >
        {hasIssues ? "Review watchlist" : "Channel health"}
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}

function GrowthCurve({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 42 - (value / max) * 30;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="mt-5 h-20 w-full overflow-visible" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="growth-line" x1="0" x2="1">
          <stop offset="0%" stopColor="#bde5ad" stopOpacity="0.95" />
          <stop offset="52%" stopColor="#84c7ff" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#ff9f8f" stopOpacity="0.78" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke="url(#growth-line)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <polyline points={`0,46 ${points} 100,46`} fill="rgb(189 229 173 / 0.06)" stroke="none" />
    </svg>
  );
}

function DashboardBento({ summary }: { summary: DashboardSummaryDTO }) {
  const issueCount = summary.counts.failedPosts + summary.counts.partiallyPublishedPosts;
  const totalReady = summary.counts.scheduledPosts + summary.counts.publishedPosts;
  const momentum = Math.max(
    0,
    Math.min(
      99,
      totalReady * 12 +
        summary.counts.draftPosts * 5 +
        summary.counts.connectedChannels * 9 -
        issueCount * 11,
    ),
  );
  const curveValues = [
    summary.counts.draftPosts + 1,
    summary.counts.scheduledPosts + 2,
    summary.counts.publishedPosts + 1,
    totalReady + summary.counts.connectedChannels + 2,
    momentum + 1,
  ];

  const cards = [
    {
      label: "Momentum",
      value: momentum,
      suffix: "%",
      helper: "growth velocity",
      icon: TrendingUp,
      className: "lg:col-span-2",
      tone: "text-[#d8ffd0]",
    },
    {
      label: "On deck",
      value: summary.counts.scheduledPosts,
      helper: "scheduled posts",
      icon: CalendarDays,
      className: "",
      tone: "text-[#84c7ff]",
    },
    {
      label: "Watchlist",
      value: issueCount,
      helper: "needs recovery",
      icon: BarChart3,
      className: "",
      tone: "text-[#f7d78a]",
    },
  ];

  return (
    <StaggerReveal className="grid gap-3 lg:grid-cols-4">
      <RevealItem className="glass-panel premium-hero relative overflow-hidden rounded-3xl p-5 lg:col-span-2 lg:row-span-2">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(189_229_173_/_0.14),transparent_54%),radial-gradient(ellipse_at_bottom_right,rgb(132_199_255_/_0.11),transparent_46%)]" />
        <div className="premium-grid-mask pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black uppercase text-[#d8ffd0]">
              AI Creator OS
            </span>
            <span className="rounded-full bg-white/[0.045] px-3 py-1 text-xs font-bold text-zinc-500">
              Cairo timezone
            </span>
          </div>
          <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.04] text-white sm:text-5xl">
            Viral intelligence, quiet enough to think.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
            Compose short-form ideas, keep the queue warm, and let AI surface the next growth move without turning the workspace into noise.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/create-post"
              className="silent-button inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#d8ffd0]/70"
            >
              <Plus size={18} aria-hidden="true" />
              Create a Reel
            </Link>
            <Link
              href="/ai-agent"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-5 text-sm font-black text-white transition hover:bg-white/[0.095] focus:outline-none focus:ring-2 focus:ring-[#bde5ad]/55"
            >
              <Sparkles size={18} aria-hidden="true" />
              Ask AI
            </Link>
          </div>
          <GrowthCurve values={curveValues} />
        </div>
      </RevealItem>

      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <RevealItem key={card.label} className={`glass-card premium-cta-card relative overflow-hidden rounded-3xl p-5 ${card.className}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-zinc-500">{card.label}</p>
                <p className="mt-4 text-4xl font-black tabular-nums text-white">
                  <AnimatedNumber value={card.value} suffix={card.suffix} />
                </p>
                <p className="mt-1 text-xs font-semibold text-zinc-500">{card.helper}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.055] ${card.tone}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
            </div>
          </RevealItem>
        );
      })}

      <RevealItem className="glass-card premium-cta-card rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#bde5ad]/12 text-[#d8ffd0]">
            <Sparkles size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-white">AI next move</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {summary.counts.connectedChannels === 0
                ? "Connect one creator channel so publishing can become real."
                : summary.counts.scheduledPosts === 0
                  ? "Schedule one vertical post this week to restart momentum."
                  : issueCount > 0
                    ? "Recover the watchlist before adding more queue pressure."
                    : "Your queue is calm. Add one experimental hook for the next posting window."}
            </p>
          </div>
        </div>
      </RevealItem>
    </StaggerReveal>
  );
}

function MiniPostStack() {
  return (
    <div className="relative mx-auto h-72 w-full max-w-[380px]" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <motion.div
          key={item}
          className="glass-card premium-cta-card absolute left-1/2 w-[248px] -translate-x-1/2 rounded-2xl p-3"
          initial={{ opacity: 0, y: 28, rotate: item === 1 ? -2 : item === 2 ? 2 : 0 }}
          animate={{ opacity: 0.9, y: item * 82, rotate: item === 1 ? -2 : item === 2 ? 2 : 0 }}
          transition={{ delay: item * 0.08, duration: 0.32, ease: "easeOut" }}
          style={{ top: 0 }}
        >
          <div className="h-1.5 w-28 rounded-full bg-white/18" />
          <div className="mt-2 h-1.5 w-36 rounded-full bg-white/12" />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#bde5ad]/60" />
              <span className="h-1.5 w-9 rounded-full bg-white/16" />
            </div>
            <span className="h-14 w-14 rounded-xl bg-white/8" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EmptyPublishingState({ hasChannels, tab }: { hasChannels: boolean; tab: BoardTab }) {
  const copy = {
    Queue: {
      title: "Your next viral window is open",
      description: "Connect a channel and schedule one short-form post to start building momentum.",
      action: hasChannels ? "Open channels" : "Connect a channel",
      href: "/channels",
    },
    Drafts: {
      title: "The idea bank is quiet",
      description: "Save hooks, b-roll notes, first comments, and raw concepts before choosing a publish time.",
      action: "Capture an idea",
      href: "/create-post",
    },
    Approvals: {
      title: "Nothing needs recovery",
      description: "Failed, partial, and approval-requested items collect here only when they need your attention.",
      action: "Check channels",
      href: "/channels",
    },
    Sent: {
      title: "No performance story yet",
      description: "Published posts and imported account content will turn this into a creator growth timeline.",
      action: "Create first post",
      href: "/create-post",
    },
  }[tab];

  return (
    <motion.div
      className="flex min-h-[540px] flex-col items-center justify-center px-4 py-14 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <MiniPostStack />
      <h2 className="mt-6 text-2xl font-black text-white">{copy.title}</h2>
      <p className="mt-3 max-w-md text-sm font-medium leading-6 text-zinc-400">
        {copy.description}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={copy.href}
          className="silent-button inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#d8ffd0]/70"
        >
          <Plus size={18} aria-hidden="true" />
          {copy.action}
        </Link>
        <Link
          href="/ai-agent"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/[0.06] px-5 text-sm font-black text-white transition hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-[#bde5ad]/55"
        >
          <Sparkles size={18} aria-hidden="true" />
          Ask AI
        </Link>
      </div>
    </motion.div>
  );
}

function QueueList({ posts }: { posts: PostCardDTO[] }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-8">
      {posts.map((post, index) => (
        <motion.article
          key={post.id}
          className="glass-card premium-cta-card rounded-3xl p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.24, ease: "easeOut" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {post.media[0] || post.imageUrl ? (
              <MediaPreview
                media={post.media[0] ?? { url: post.imageUrl!, mediaType: "unknown" as const }}
                className="h-28 w-full shrink-0 rounded-2xl sm:w-28"
              />
            ) : (
              <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-2xl bg-white/[0.045] text-zinc-500 sm:w-28">
                <Send size={22} aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="line-clamp-2 text-sm font-black text-white">
                    {post.caption || "Untitled post"}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-zinc-400">
                    <Clock3 size={14} aria-hidden="true" />
                    {formatSlot(post.scheduledFor)}
                  </p>
                </div>
                <StatusPill status={post.status} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {post.platforms.map((platform) => (
                  <span
                    key={platform}
                    className="rounded-full bg-white/[0.055] px-3 py-1 text-xs font-bold text-zinc-300"
                  >
                    {platform}
                  </span>
                ))}
                <Link
                  href={`/edit-post/${post.id}`}
                  className="ml-auto inline-flex min-h-8 items-center rounded-xl px-3 text-xs font-black text-[#d8ffd0] transition hover:bg-white/8"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}

function CalendarPreview({ posts }: { posts: PostCardDTO[] }) {
  const days = useMemo(() => {
    const today = new Date();

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const key = date.toDateString();
      const dayPosts = posts.filter((post) => {
        if (!post.scheduledFor) return false;

        return new Date(post.scheduledFor).toDateString() === key;
      });

      return { date, posts: dayPosts };
    });
  }, [posts]);

  return (
    <div className="p-4 sm:p-6">
      <div className="premium-scrollbar overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7 gap-3">
          {days.map((day, index) => (
            <motion.section
              key={day.date.toISOString()}
              className="glass-card premium-cta-card min-h-[430px] rounded-3xl p-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035, duration: 0.22 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-black uppercase text-zinc-500">
                    {day.date.toLocaleDateString(undefined, { weekday: "short" })}
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">{day.date.getDate()}</p>
                </div>
                <span className="rounded-full bg-white/[0.055] px-2 py-1 text-[11px] font-black text-zinc-500">
                  {day.posts.length}
                </span>
              </div>

              <Link
                href="/create-post"
                className="mt-4 flex min-h-10 w-full items-center justify-center rounded-2xl bg-white/[0.045] text-zinc-500 transition hover:bg-[#bde5ad]/10 hover:text-[#d8ffd0]"
                aria-label={`Add post on ${day.date.toLocaleDateString()}`}
              >
                <Plus size={16} aria-hidden="true" />
              </Link>

              {day.posts.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {day.posts.slice(0, 3).map((post) => (
                    <Link
                      key={post.id}
                      href={`/edit-post/${post.id}`}
                      className="block rounded-2xl bg-black/18 p-3 transition hover:bg-white/[0.055] focus:outline-none focus:ring-2 focus:ring-[#bde5ad]/55"
                    >
                      <p className="text-xs font-black text-[#d8ffd0]">{formatSlot(post.scheduledFor)}</p>
                      <p className="mt-2 line-clamp-3 text-xs font-bold leading-5 text-zinc-100">
                        {post.caption || "Untitled post"}
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-zinc-500">
                        <ImageIcon size={13} aria-hidden="true" />
                        {post.platforms.join(", ")}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl bg-white/[0.035] p-3 text-xs leading-5 text-zinc-500">
                  Open slot for a short-form experiment.
                </p>
              )}
            </motion.section>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupChecklist({ summary }: { summary: DashboardSummaryDTO }) {
  const items = setupItems(summary);
  const completed = items.filter((item) => item.complete).length;
  const progress = Math.round((completed / items.length) * 100);

  return (
    <aside className="glass-card premium-cta-card rounded-3xl p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-white">Creator ignition</h2>
        <span className="text-xs font-black text-zinc-500">{completed} of {items.length}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.055]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#bde5ad] via-[#84c7ff] to-[#ff9f8f]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
      <div className="mt-4 space-y-1">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex min-h-12 items-center gap-3 rounded-2xl px-2 text-sm font-bold text-zinc-200 transition hover:bg-white/[0.055]"
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                item.complete ? "bg-[#bde5ad] text-[#071108]" : "bg-white/[0.055] text-transparent"
              }`}
            >
              <Check size={13} aria-hidden="true" />
            </span>
            <span className={item.complete ? "line-through decoration-white/25" : ""}>{item.label}</span>
            <ChevronRight className="ml-auto text-zinc-600" size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </aside>
  );
}

function GrowthRail({ summary }: { summary: DashboardSummaryDTO }) {
  const pulse = [
    { label: "Channels", value: summary.counts.connectedChannels, icon: Users },
    { label: "Queued", value: summary.counts.scheduledPosts, icon: CalendarDays },
    { label: "Drafts", value: summary.counts.draftPosts, icon: MessageCircle },
  ];

  return (
    <div className="hidden w-[340px] shrink-0 space-y-4 p-5 2xl:block">
      <SetupChecklist summary={summary} />
      <section className="glass-card premium-cta-card rounded-3xl p-4">
        <p className="text-sm font-black text-white">Workspace pulse</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {pulse.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="rounded-2xl bg-white/[0.045] p-3">
                <Icon size={16} className="text-[#d8ffd0]" aria-hidden="true" />
                <p className="mt-3 text-2xl font-black tabular-nums text-white">{item.value}</p>
                <p className="mt-1 text-[11px] font-bold text-zinc-500">{item.label}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-3 text-sm text-zinc-300">
          <p className="flex items-center gap-2">
            <Circle size={13} className="text-[#bde5ad]" aria-hidden="true" />
            Short-form workflows stay first-class.
          </p>
          <p className="flex items-center gap-2">
            <Circle size={13} className="text-[#84c7ff]" aria-hidden="true" />
            Calendar slots visualize the next week.
          </p>
          <p className="flex items-center gap-2">
            <Circle size={13} className="text-[#ff9f8f]" aria-hidden="true" />
            Recovery items stay grouped until resolved.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function PublishWorkspace({ summary }: PublishWorkspaceProps) {
  const [tab, setTab] = useState<BoardTab>("Queue");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [accountPosts, setAccountPosts] = useState<SocialPostDTO[]>([]);
  const reduceMotion = useReducedMotion();
  const hasChannels = summary.counts.connectedChannels > 0;

  useEffect(() => {
    let active = true;

    listImportedSocialPosts()
      .then((posts) => {
        if (active) setAccountPosts(posts);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const tabCounts = useMemo(
    () => ({
      Queue: summary.counts.scheduledPosts,
      Drafts: summary.counts.draftPosts,
      Approvals: summary.counts.partiallyPublishedPosts + summary.counts.failedPosts,
      Sent: summary.counts.publishedPosts + summary.counts.partiallyPublishedPosts + accountPosts.length,
    }),
    [summary.counts, accountPosts.length],
  );
  const posts =
    tab === "Queue"
      ? summary.scheduledQueue
      : tab === "Drafts"
        ? summary.draftQueue
        : tab === "Approvals"
          ? summary.recentPublished.filter((post) => post.status === "Failed" || post.status === "Partially Published" || post.approvalRequested)
          : summary.recentPublished;

  return (
    <section className="space-y-5">
      <ViewportReveal>
        <SoftNotice summary={summary} />
      </ViewportReveal>
      <ViewportReveal delay={0.04}>
        <DashboardBento summary={summary} />
      </ViewportReveal>

      <ViewportReveal delay={0.08}>
      <section className="glass-panel premium-hero overflow-hidden rounded-3xl">
        <div className="flex min-h-[760px]">
          <div className="min-w-0 flex-1">
            <header className="px-5 py-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.055] text-white">
                    <Grid2X2 size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">Creator workspace</h2>
                    <p className="mt-1 text-sm text-zinc-400">Queue, drafts, sent content, and channel health in one focused flow.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm font-black transition ${
                      view === "list" ? "bg-white/[0.105] text-white" : "bg-white/[0.045] text-zinc-300 hover:bg-white/[0.075]"
                    }`}
                  >
                    <List size={16} aria-hidden="true" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("calendar")}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 text-sm font-black transition ${
                      view === "calendar" ? "bg-white/[0.105] text-white" : "bg-white/[0.045] text-zinc-300 hover:bg-white/[0.075]"
                    }`}
                  >
                    <CalendarDays size={16} aria-hidden="true" />
                    Calendar
                  </button>
                  <Link
                    href="/create-post"
                    className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-white/[0.06] px-3 text-sm font-black text-white transition hover:bg-white/[0.095]"
                  >
                    <Plus size={16} aria-hidden="true" />
                    New
                  </Link>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="premium-scrollbar flex overflow-x-auto rounded-2xl bg-white/[0.035] p-1">
                  {TABS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTab(item)}
                      className={`relative inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-black transition ${
                        tab === item ? "text-white" : "text-zinc-400 hover:text-zinc-100"
                      }`}
                    >
                      {tab === item ? (
                        <motion.span
                          layoutId="publish-tab-bg"
                          className="absolute inset-0 rounded-xl bg-white/[0.085]"
                          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 32 }}
                        />
                      ) : null}
                      <span className="relative">{item}</span>
                      <span className="relative rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-200">{tabCounts[item]}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-black text-zinc-300">
                  <Link href="/channels" className="inline-flex min-h-9 items-center gap-2 rounded-2xl px-3 hover:bg-white/6">
                    <MessageCircle size={16} aria-hidden="true" />
                    Channels
                  </Link>
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-2xl bg-white/[0.035] px-3 text-zinc-400">
                    Cairo
                  </span>
                </div>
              </div>
            </header>

            <div className="soft-divider" />

            <AnimatePresence mode="wait">
              <motion.div
                key={`${tab}-${view}-${posts.length}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
              >
                {view === "calendar" ? (
                  <CalendarPreview posts={summary.scheduledQueue} />
                ) : tab === "Sent" && (posts.length > 0 || accountPosts.length > 0) ? (
                  <div>
                    {posts.length > 0 ? <QueueList posts={posts} /> : null}
                    <div className="mx-auto w-full max-w-3xl space-y-3 px-4 pb-8">
                      {accountPosts.map((post) => (
                        <SocialPostCard key={post.id} post={post} compact />
                      ))}
                    </div>
                  </div>
                ) : posts.length > 0 ? (
                  <QueueList posts={posts} />
                ) : (
                  <EmptyPublishingState hasChannels={hasChannels} tab={tab} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <GrowthRail summary={summary} />
        </div>
      </section>
      </ViewportReveal>
    </section>
  );
}
