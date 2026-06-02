"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AtSign, Camera, Globe2, Link2, Music2, Plug, Unplug } from "lucide-react";

import LoadingButton from "@/components/LoadingButton";
import StatusPill from "@/components/ui/StatusPill";
import type { ConnectedAccountDTO, Platform } from "@/lib/types";

export type ChannelPlatform = Platform | "Threads";

interface ChannelCardProps {
  platform: ChannelPlatform;
  account?: ConnectedAccountDTO;
  loading?: boolean;
  onConnect: (platform: ChannelPlatform) => void;
  onDisconnect?: (account: ConnectedAccountDTO) => void;
}

function PlatformIcon({ platform }: { platform: ChannelPlatform }) {
  if (platform === "Facebook") return <Globe2 size={24} aria-hidden="true" />;
  if (platform === "Instagram") return <Camera size={24} aria-hidden="true" />;
  if (platform === "Threads") return <AtSign size={24} aria-hidden="true" />;
  if (platform === "LinkedIn") return <Link2 size={24} aria-hidden="true" />;
  return <Music2 size={24} aria-hidden="true" />;
}

function platformDescription(platform: ChannelPlatform) {
  if (platform === "Facebook") return "Connect eligible Facebook Pages for publishing.";
  if (platform === "Instagram") return "Instagram Business or Creator account required.";
  if (platform === "Threads") return "Threads publishing provider is coming soon.";
  if (platform === "LinkedIn") return "Connect a LinkedIn member profile for text publishing.";
  return "TikTok publishing provider is coming soon.";
}

export default function ChannelCard({
  platform,
  account,
  loading = false,
  onConnect,
  onDisconnect,
}: ChannelCardProps) {
  const reduceMotion = useReducedMotion();
  const placeholder = platform !== "Instagram" && platform !== "Facebook" && platform !== "LinkedIn";

  return (
    <motion.article
      className="reference-glass reference-gradient-border reference-hover-lift rounded-2xl p-5"
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
            <PlatformIcon platform={platform} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{platform}</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-400">{platformDescription(platform)}</p>
          </div>
        </div>
        {account ? <StatusPill status={account.status} /> : null}
      </div>

      {account ? (
        <div className="mt-5 rounded-xl border border-white/[0.075] bg-white/[0.025] p-4">
          <p className="font-semibold text-white">{account.accountName}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {account.publishCapable ? "Publish capable" : "Not selectable for live publishing"}
          </p>
        </div>
      ) : null}

      <div className="mt-5">
        {placeholder ? (
          <StatusPill status="Coming soon" />
        ) : account && account.status === "Connected" ? (
          <LoadingButton
            loading={loading}
            onClick={() => onDisconnect?.(account)}
            text="Disconnect"
            loadingText="Disconnecting..."
            className="min-h-10 rounded-xl bg-rose-500/82 px-4 text-sm font-semibold text-white hover:bg-rose-400"
          />
        ) : (
          <LoadingButton
            loading={loading}
            onClick={() => onConnect(platform)}
            text={
              platform === "Instagram"
                ? "Connect Instagram"
                : platform === "Facebook"
                  ? "Connect Facebook"
                  : platform === "LinkedIn"
                    ? "Connect LinkedIn"
                    : "Connect"
            }
            loadingText="Connecting..."
            className="silent-button min-h-10 rounded-xl px-4 text-sm font-black"
          />
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
        {account ? <Unplug size={14} aria-hidden="true" /> : <Plug size={14} aria-hidden="true" />}
        {account ? "Managed through account connection state" : "Authorization required before selection"}
      </div>
    </motion.article>
  );
}
