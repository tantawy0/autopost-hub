"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "emerald" | "sky" | "amber" | "violet" | "rose";
  helper?: string;
}

const TONES = {
  emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  sky: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  amber: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  violet: "border-violet-300/20 bg-violet-300/10 text-violet-200",
  rose: "border-rose-300/20 bg-rose-300/10 text-rose-200",
};

export default function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "emerald",
  helper,
}: MetricCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="app-panel-soft rounded-lg p-5 transition hover:border-white/20"
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-zinc-400">{label}</p>
          <p className="mt-3 text-3xl font-black tabular-nums text-white">{value}</p>
          {helper ? <p className="mt-1 text-xs leading-5 text-zinc-500">{helper}</p> : null}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${TONES[tone]}`}>
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>
    </motion.div>
  );
}
