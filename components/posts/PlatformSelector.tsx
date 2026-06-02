"use client";

import { Check, Layers3 } from "lucide-react";

import type { ConnectedAccountDTO } from "@/lib/types";
import StatusPill from "@/components/ui/StatusPill";

interface PlatformSelectorProps {
  destinations: ConnectedAccountDTO[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

export default function PlatformSelector({
  destinations,
  selectedIds,
  onChange,
}: PlatformSelectorProps) {
  const toggleDestination = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  };

  if (destinations.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
        <div className="flex items-start gap-3">
          <Layers3 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Connect a publishing destination before scheduling live posts. Drafts can still be saved.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {destinations.map((destination) => {
        const checked = selectedIds.includes(destination.id);
        const disabled = destination.reconnectRequired || !destination.publishCapable;

        return (
          <button
            key={destination.id}
            type="button"
            disabled={disabled}
            onClick={() => toggleDestination(destination.id)}
            className={`group w-full rounded-2xl p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#bde5ad]/55 ${
              checked
                ? "bg-[#bde5ad]/12 shadow-[0_0_34px_rgb(189_229_173_/_0.08)]"
                : "bg-white/[0.04] hover:bg-white/8"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    checked
                      ? "border-[#bde5ad] bg-[#bde5ad] text-zinc-950"
                      : "border-white/20 text-transparent group-hover:border-white/35"
                  }`}
                >
                  <Check size={13} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{destination.accountName}</p>
                  <p className="mt-1 text-sm text-zinc-400">{destination.platform}</p>
                </div>
              </div>
              <StatusPill status={destination.status} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
