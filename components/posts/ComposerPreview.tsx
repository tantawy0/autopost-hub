"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, CalendarClock, Heart, MessageCircle, Repeat2, Send, Sparkles } from "lucide-react";

import MediaPreview from "@/components/posts/MediaPreview";
import type { ConnectedAccountDTO, MediaAssetDTO } from "@/lib/types";
import { getPlatformTone } from "@/lib/channels";

interface ComposerPreviewProps {
  caption: string;
  firstComment: string;
  media: MediaAssetDTO | null;
  mediaItems?: MediaAssetDTO[];
  selectedDestinations: ConnectedAccountDTO[];
  scheduleTime: string;
  postFormat?: "Post" | "Reel" | "Story";
}

export default function ComposerPreview({
  caption,
  firstComment,
  media,
  mediaItems = media ? [media] : [],
  selectedDestinations,
  scheduleTime,
  postFormat = "Post",
}: ComposerPreviewProps) {
  const reduceMotion = useReducedMotion();
  const previewDestinations =
    selectedDestinations.length > 0
      ? selectedDestinations
      : [
          {
            id: "preview",
            platform: "Instagram" as const,
            accountName: "Channel preview",
            status: "Placeholder" as const,
            reconnectRequired: false,
            publishCapable: false,
          },
        ];

  return (
    <motion.section
      className="glass-card rounded-3xl p-4"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase text-zinc-300">Live social preview</h2>
          <p className="mt-1 text-xs text-zinc-500">{caption.length} characters</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-300/10 text-sky-200">
          <Sparkles size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {previewDestinations.slice(0, 2).map((destination) => (
          <motion.article
            key={destination.id}
            className="overflow-hidden rounded-3xl bg-[#080b0f]/70 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)]"
            whileHover={reduceMotion ? undefined : { y: -2 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className={`h-1 bg-gradient-to-r ${getPlatformTone(destination.platform)}`} />
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-2xl bg-gradient-to-br ${getPlatformTone(destination.platform)}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{destination.accountName}</p>
                  <p className="text-xs text-zinc-500">{destination.platform}</p>
                </div>
              </div>

              {mediaItems.length > 0 ? (
                <div className="mt-4">
                  <MediaPreview
                    media={mediaItems[0]}
                    controls={mediaItems[0].mediaType === "video"}
                    className={`rounded-2xl ${
                      postFormat === "Story" || postFormat === "Reel" || destination.platform === "TikTok"
                        ? "mx-auto aspect-[9/16] max-h-[420px] w-[70%]"
                        : "aspect-square w-full"
                    }`}
                  />
                  {mediaItems.length > 1 ? (
                    <div className="mt-2 flex gap-1">
                      {mediaItems.slice(0, 6).map((item, index) => (
                        <span
                          key={`${item.url}-${index}`}
                          className={`h-1.5 flex-1 rounded-full ${index === 0 ? "bg-[#93c47d]" : "bg-white/15"}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 flex aspect-video items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.03] text-xs font-semibold text-zinc-500">
                  {postFormat === "Post" ? "Media preview" : `${postFormat} media preview`}
                </div>
              )}

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                {caption.trim() || "Your caption will appear here."}
              </p>

              <div className="mt-4 flex items-center justify-between text-zinc-500">
                <div className="flex items-center gap-4">
                  <Heart size={18} aria-hidden="true" />
                  <MessageCircle size={18} aria-hidden="true" />
                  <Repeat2 size={18} aria-hidden="true" />
                  <Send size={18} aria-hidden="true" />
                </div>
                <Bookmark size={18} aria-hidden="true" />
              </div>

              {firstComment.trim() ? (
                <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/8 p-3">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-200">
                    <MessageCircle size={14} aria-hidden="true" />
                    First comment
                  </p>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-300">{firstComment}</p>
                </div>
              ) : null}
            </div>
          </motion.article>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.055] px-3 py-2 text-xs text-zinc-400">
        <CalendarClock size={14} aria-hidden="true" />
        <span>
          {scheduleTime ? new Date(scheduleTime).toLocaleString() : "No schedule time selected"}
        </span>
      </div>
    </motion.section>
  );
}
