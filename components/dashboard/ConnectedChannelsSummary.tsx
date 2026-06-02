import Link from "next/link";
import { Layers3 } from "lucide-react";

import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/ui/StatusPill";
import type { ConnectedAccountDTO } from "@/lib/types";

interface ConnectedChannelsSummaryProps {
  channels: ConnectedAccountDTO[];
}

export default function ConnectedChannelsSummary({ channels }: ConnectedChannelsSummaryProps) {
  return (
    <section className="app-panel-soft rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Connected Channels</h2>
          <p className="text-sm text-zinc-400">Publishing destinations available to the composer</p>
        </div>
        <Link href="/channels" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          Manage
        </Link>
      </div>

      {channels.length === 0 ? (
        <EmptyState
          icon={Layers3}
          title="No channels connected"
          description="Connect Instagram, Facebook, or LinkedIn to unlock live publishing destinations."
        />
      ) : (
        <div className="space-y-3">
          {channels.slice(0, 5).map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-zinc-950/45 p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{channel.accountName}</p>
                <p className="text-sm text-zinc-400">{channel.platform}</p>
              </div>
              <StatusPill status={channel.status} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
