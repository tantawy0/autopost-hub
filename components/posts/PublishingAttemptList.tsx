import StatusPill from "@/components/ui/StatusPill";
import type { PublishingAttemptDTO } from "@/lib/types";

interface PublishingAttemptListProps {
  attempts: PublishingAttemptDTO[];
  failureSummary?: string | null;
}

export default function PublishingAttemptList({
  attempts,
  failureSummary,
}: PublishingAttemptListProps) {
  if (attempts.length === 0 && !failureSummary) return null;

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-zinc-950/40 p-4">
      <p className="text-sm font-semibold text-zinc-200">Destination outcomes</p>
      {failureSummary ? (
        <p className="mt-2 text-sm leading-6 text-rose-200">{failureSummary}</p>
      ) : null}
      {attempts.length > 0 ? (
        <div className="mt-3 space-y-2">
          {attempts.map((attempt, index) => (
            <div key={attempt.id ?? `${attempt.platform}-${index}`} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{attempt.destinationAccountName}</p>
                <p className="text-xs text-zinc-500">{attempt.platform}</p>
              </div>
              <StatusPill status={attempt.status} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
