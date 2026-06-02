"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import StatusPill from "@/components/ui/StatusPill";
import type { ConnectedAccountDTO } from "@/lib/types";

interface ConnectedAccountListProps {
  accounts: ConnectedAccountDTO[];
}

export default function ConnectedAccountList({ accounts }: ConnectedAccountListProps) {
  return (
    <section className="reference-glass rounded-2xl p-5">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-white">Connected channels</h2>
        <p className="mt-1 text-sm text-zinc-400">Manage connected publishing destinations</p>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.075] bg-white/[0.025] p-6 text-center">
          <p className="text-sm font-semibold text-zinc-300">No publishing destination is connected yet.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link href="/channels?connect=instagram" className="silent-button inline-flex min-h-10 items-center gap-2 rounded-2xl px-4 text-sm font-black">
              <Plus size={16} aria-hidden="true" />
              Connect Instagram
            </Link>
            <Link href="/channels?connect=facebook" className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-black text-white hover:bg-white/12">
              <Plus size={16} aria-hidden="true" />
              Connect Facebook
            </Link>
            <Link href="/channels?connect=linkedin" className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm font-black text-white hover:bg-white/12">
              <Plus size={16} aria-hidden="true" />
              Connect LinkedIn
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
          {accounts.map((account, index) => (
            <motion.div
              key={account.id}
              className="flex items-center justify-between gap-4 bg-zinc-950/40 p-4 transition hover:bg-zinc-900/70"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.18 }}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{account.accountName}</p>
                <p className="text-sm text-zinc-400">{account.platform}</p>
              </div>
              <StatusPill status={account.status} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
