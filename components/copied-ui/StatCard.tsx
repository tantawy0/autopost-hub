import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, delta, icon: Icon, hint, className }: StatCardProps) {
  const up = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-5 hover-lift gradient-border",
        className,
      )}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-primary opacity-[0.08] blur-2xl" />
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && (
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-secondary/60 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 font-display text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span className={cn(
            "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
            up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
          )}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </motion.div>
  );
}
