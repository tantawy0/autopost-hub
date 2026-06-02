import type { ConnectedAccountStatus, PostStatus, PublishingAttemptStatus } from "@/lib/types";

type StatusPillProps = {
  status: PostStatus | ConnectedAccountStatus | PublishingAttemptStatus | "Coming soon";
  className?: string;
};

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
  Scheduled: "bg-sky-400/15 text-sky-200 ring-sky-400/30",
  Published: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30",
  "Partially Published": "bg-violet-400/15 text-violet-200 ring-violet-400/30",
  Failed: "bg-rose-400/15 text-rose-200 ring-rose-400/30",
  Connected: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30",
  Disconnected: "bg-zinc-400/15 text-zinc-200 ring-zinc-400/30",
  Expired: "bg-orange-400/15 text-orange-200 ring-orange-400/30",
  Revoked: "bg-rose-400/15 text-rose-200 ring-rose-400/30",
  Unauthorized: "bg-rose-400/15 text-rose-200 ring-rose-400/30",
  Placeholder: "bg-zinc-400/15 text-zinc-200 ring-zinc-400/30",
  "Coming soon": "bg-zinc-400/15 text-zinc-200 ring-zinc-400/30",
  Pending: "bg-sky-400/15 text-sky-200 ring-sky-400/30",
  Publishing: "bg-sky-400/15 text-sky-200 ring-sky-400/30",
  Succeeded: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30",
  Skipped: "bg-zinc-400/15 text-zinc-200 ring-zinc-400/30",
};

export default function StatusPill({ status, className = "" }: StatusPillProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ring-1 ${STATUS_STYLES[status]} ${className}`}
    >
      {status}
    </span>
  );
}
