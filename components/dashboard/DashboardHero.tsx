import Link from "next/link";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";

import ExplodingInsights from "@/components/dashboard/ExplodingInsights";
import type { DashboardSummaryDTO } from "@/lib/types";

interface DashboardHeroProps {
  summary: DashboardSummaryDTO;
}

export default function DashboardHero({ summary }: DashboardHeroProps) {
  const nextPost = summary.scheduledQueue[0];
  const issueCount = summary.counts.failedPosts + summary.counts.partiallyPublishedPosts;

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,0.85fr)]">
      <div className="app-panel overflow-hidden rounded-lg p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase text-emerald-200">
            Live command center
          </span>
          <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-xs font-bold uppercase text-sky-200">
            {summary.counts.connectedChannels} channels live
          </span>
        </div>

        <div className="mt-8 max-w-3xl">
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            Plan the next post, keep the queue visible, and catch publishing issues before they turn into missed content.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/create-post"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-5 text-sm font-black text-zinc-950 shadow-[0_14px_35px_rgb(61_220_151_/_0.2)] transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <Plus size={18} aria-hidden="true" />
            Create post
          </Link>
          <Link
            href="/calendar"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/8 px-5 text-sm font-bold text-white transition hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <CalendarDays size={18} aria-hidden="true" />
            Open calendar
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-[#090d12]/70 p-4">
            <p className="text-xs font-bold uppercase text-zinc-500">Next slot</p>
            <p className="mt-2 line-clamp-2 text-sm font-bold text-white">
              {nextPost?.caption || "No scheduled post yet"}
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              {nextPost?.scheduledFor
                ? new Date(nextPost.scheduledFor).toLocaleString()
                : "Create a post to fill the queue"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#090d12]/70 p-4">
            <p className="text-xs font-bold uppercase text-zinc-500">Issue watch</p>
            <p className="mt-2 text-3xl font-black text-white">{issueCount}</p>
            <p className="mt-1 text-xs text-zinc-400">Failed or partial outcomes</p>
          </div>
          <Link
            href="/channels"
            className="group rounded-lg border border-white/10 bg-[#090d12]/70 p-4 transition hover:border-emerald-300/35 hover:bg-emerald-300/8 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <p className="text-xs font-bold uppercase text-zinc-500">Destinations</p>
            <p className="mt-2 text-3xl font-black text-white">{summary.counts.connectedChannels}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-200">
              Manage channels
              <ArrowRight size={13} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
            </p>
          </Link>
        </div>
      </div>

      <ExplodingInsights summary={summary} />
    </section>
  );
}
