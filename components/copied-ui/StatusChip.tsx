"use client";

import { cn } from "@/lib/utils";
import type { UiPostStatus } from "@/lib/ui-repo-adapters";
import { CheckCircle2, Clock, FileText, Loader2, AlertTriangle } from "lucide-react";
import { useUiStore } from "@/lib/ui-store";
import { getStatusLabel } from "@/lib/page-copy";

const map: Record<UiPostStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground", icon: FileText },
  scheduled: { label: "Scheduled", cls: "bg-primary/15 text-primary border-primary/20", icon: Clock },
  publishing: { label: "Publishing", cls: "bg-accent/15 text-accent border-accent/20", icon: Loader2 },
  published: { label: "Published", cls: "bg-success/15 text-success border-success/20", icon: CheckCircle2 },
  failed: { label: "Failed", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertTriangle },
};

export function StatusChip({ status, className }: { status: UiPostStatus; className?: string }) {
  const locale = useUiStore((state) => state.locale);
  const m = map[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium", m.cls, className)}>
      <Icon className={cn("h-3 w-3", status === "publishing" && "animate-spin")} />
      {getStatusLabel(status, locale)}
    </span>
  );
}
