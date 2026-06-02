"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  FileText,
  Layers3,
  Sparkles,
} from "lucide-react";

import type { DashboardSummaryDTO } from "@/lib/types";

interface ExplodingInsightsProps {
  summary: DashboardSummaryDTO;
}

const POSITIONS = [
  { x: -198, y: -96 },
  { x: 0, y: -142 },
  { x: 198, y: -96 },
  { x: 190, y: 96 },
  { x: 0, y: 142 },
  { x: -190, y: 96 },
];

const COMPACT_POSITIONS = [
  { x: -96, y: -128 },
  { x: 96, y: -128 },
  { x: -96, y: 0 },
  { x: 96, y: 0 },
  { x: -96, y: 128 },
  { x: 96, y: 128 },
];

export default function ExplodingInsights({ summary }: ExplodingInsightsProps) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(true);
  const [compact, setCompact] = useState(false);
  const issueCount = summary.counts.failedPosts + summary.counts.partiallyPublishedPosts;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const updateCompact = () => setCompact(mediaQuery.matches);

    updateCompact();
    mediaQuery.addEventListener("change", updateCompact);

    return () => mediaQuery.removeEventListener("change", updateCompact);
  }, []);

  const items = useMemo(
    () => [
      {
        label: "Draft bank",
        value: summary.counts.draftPosts,
        detail: "Ideas waiting for a schedule.",
        icon: FileText,
        tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
      },
      {
        label: "On deck",
        value: summary.counts.scheduledPosts,
        detail: "Posts lined up in the queue.",
        icon: CalendarCheck2,
        tone: "border-sky-300/25 bg-sky-300/10 text-sky-100",
      },
      {
        label: "Channels",
        value: summary.counts.connectedChannels,
        detail: "Live destinations available now.",
        icon: Layers3,
        tone: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
      },
      {
        label: "Published",
        value: summary.counts.publishedPosts,
        detail: "Completed delivery outcomes.",
        icon: CheckCircle2,
        tone: "border-teal-300/25 bg-teal-300/10 text-teal-100",
      },
      {
        label: "Watchlist",
        value: issueCount,
        detail: "Partial or failed attempts.",
        icon: AlertTriangle,
        tone: "border-rose-300/25 bg-rose-300/10 text-rose-100",
      },
      {
        label: "Library",
        value: summary.counts.totalPosts,
        detail: "Total owned posts in the hub.",
        icon: Sparkles,
        tone: "border-violet-300/25 bg-violet-300/10 text-violet-100",
      },
    ],
    [issueCount, summary.counts],
  );

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-white/10 bg-[#080b0f]/80 p-5">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgb(61_220_151_/_0.12),transparent_36%,rgb(88_166_255_/_0.12))]" />
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-200">Live map</p>
          <h2 className="mt-1 text-lg font-black text-white">Pipeline intelligence</h2>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-3 text-xs font-bold text-zinc-100 transition hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <Sparkles size={15} aria-hidden="true" />
          {expanded ? "Focus" : "Expand"}
        </button>
      </div>

      <div className="relative z-10 mx-auto mt-8 h-[410px] max-w-[620px] sm:h-[330px]">
        <motion.div
          className="absolute left-1/2 top-1/2 z-20 hidden h-28 w-28 items-center justify-center rounded-lg border border-emerald-200/25 bg-emerald-300 text-center text-zinc-950 shadow-[0_26px_60px_rgb(61_220_151_/_0.25)] sm:flex"
          style={{ marginLeft: -56, marginTop: -56 }}
          animate={{ scale: expanded ? 1 : 0.92 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 22 }}
        >
          <div>
            <p className="text-3xl font-black">{summary.counts.scheduledPosts}</p>
            <p className="mt-1 text-xs font-black uppercase">queued</p>
          </div>
        </motion.div>

        {items.map((item, index) => {
          const Icon = item.icon;
          const position = compact ? COMPACT_POSITIONS[index] : POSITIONS[index];
          const target = expanded ? position : { x: 0, y: 0 };

          return (
            <motion.article
              key={item.label}
              className={`absolute left-1/2 top-1/2 z-10 w-[154px] rounded-lg border p-3 shadow-[0_16px_40px_rgb(0_0_0_/_0.2)] backdrop-blur ${item.tone}`}
              style={{ marginLeft: -77, marginTop: -45 }}
              initial={false}
              animate={{
                x: target.x,
                y: target.y,
                opacity: expanded ? 1 : 0.72,
                scale: expanded ? 1 : 0.72,
              }}
              transition={{
                type: "spring",
                stiffness: 210,
                damping: 24,
                delay: reduceMotion ? 0 : index * 0.035,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon size={18} aria-hidden="true" />
                <span className="text-2xl font-black tabular-nums">{item.value}</span>
              </div>
              <p className="mt-2 text-sm font-black text-white">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-300">{item.detail}</p>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
