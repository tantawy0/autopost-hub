"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Pencil, Send, Trash2 } from "lucide-react";

import LoadingButton from "@/components/LoadingButton";
import MediaPreview from "@/components/posts/MediaPreview";
import PostStatusBadge from "@/components/posts/PostStatusBadge";
import PublishingAttemptList from "@/components/posts/PublishingAttemptList";
import type { PostCardDTO } from "@/lib/types";

interface PostCardProps {
  post: PostCardDTO;
  onDelete?: (post: PostCardDTO) => void;
  onPublish?: (post: PostCardDTO) => void;
  publishing?: boolean;
}

export default function PostCard({ post, onDelete, onPublish, publishing = false }: PostCardProps) {
  const reduceMotion = useReducedMotion();
  const primaryMedia = post.media[0] ?? (post.imageUrl ? { url: post.imageUrl, mediaType: "unknown" as const } : null);

  return (
    <motion.article
      className="glass-card premium-cta-card rounded-3xl p-4"
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4 md:flex-row">
        {primaryMedia ? (
          <MediaPreview
            media={primaryMedia}
            className="h-48 w-full shrink-0 rounded-2xl md:h-36 md:w-36"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="line-clamp-2 text-lg font-bold text-white">
                {post.caption || "Untitled post"}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {post.scheduledFor
                  ? `Scheduled ${new Date(post.scheduledFor).toLocaleString()}`
                  : post.publishedAt
                    ? `Published ${new Date(post.publishedAt).toLocaleString()}`
                    : "No schedule time"}
              </p>
            </div>
            <PostStatusBadge status={post.status} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {post.platforms.map((platform) => (
              <span
                key={platform}
                className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-zinc-200"
              >
                {platform}
              </span>
            ))}
          </div>

          {post.firstComment ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-3">
              <p className="text-xs font-semibold uppercase text-zinc-500">First comment</p>
              <p className="mt-1 text-sm leading-6 text-zinc-200">{post.firstComment}</p>
            </div>
          ) : null}

          <PublishingAttemptList attempts={post.attempts} failureSummary={post.failureSummary} />

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/edit-post/${post.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-[#bde5ad]/55"
            >
              <Pencil size={16} aria-hidden="true" />
              Edit
            </Link>
            {onPublish ? (
              <LoadingButton
                loading={publishing}
                onClick={() => onPublish(post)}
                text="Publish now"
                loadingText="Publishing..."
                className="silent-button min-h-10 rounded-2xl px-4 text-sm font-black"
              />
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(post)}
                className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-rose-500/82 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </button>
            ) : null}
            {post.status === "Scheduled" && !onPublish ? (
              <span className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-white/[0.035] px-4 text-sm font-semibold text-zinc-500">
                <Send size={16} aria-hidden="true" />
                Awaiting scheduler
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
