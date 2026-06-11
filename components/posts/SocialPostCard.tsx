"use client";

import { BarChart3, Eye, Heart, MessageCircle, Repeat2, Send, Star, UserPlus } from "lucide-react";

import MediaPreview from "@/components/posts/MediaPreview";
import type { SocialPostDTO } from "@/lib/types";

export function getSocialPostMetrics(post: SocialPostDTO) {
  return {
    reactions: post.reactionsCount ?? post.likeCount,
    comments: post.commentsCount,
    engagementRate: post.engagementRate === null ? null : `${post.engagementRate}%`,
    views: post.viewsCount,
    shares: post.sharesCount,
    saves: post.savesCount,
    follows: post.followsCount,
    reach: post.reachCount,
  };
}

export default function SocialPostCard({ post, compact = false }: { post: SocialPostDTO; compact?: boolean }) {
  const metrics = getSocialPostMetrics(post);
  const stats = [
    { label: "Reactions", value: metrics.reactions ?? "-", icon: Heart },
    { label: "Comments", value: metrics.comments ?? "-", icon: MessageCircle },
    { label: "Eng. Rate", value: metrics.engagementRate ?? "-", icon: BarChart3 },
    { label: "Views", value: metrics.views ?? "-", icon: Eye },
    { label: "Shares", value: metrics.shares ?? "-", icon: Repeat2 },
    { label: "Saves", value: metrics.saves ?? "-", icon: Star },
    { label: "Follows", value: metrics.follows ?? "-", icon: UserPlus },
    { label: "Reach", value: metrics.reach ?? "-", icon: Send },
  ];

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-secondary/30 transition hover:border-primary/30 hover:bg-secondary/50">
      <div className="flex flex-col gap-4 p-4 md:flex-row">
        {post.mediaUrl ? (
          <MediaPreview
            media={{
              url: post.mediaUrl,
              mediaType: post.mediaType?.toLowerCase().includes("video") ? "video" : "image",
            }}
            className={`${compact ? "h-28 md:w-28" : "h-44 md:h-36 md:w-36"} w-full shrink-0 rounded-lg`}
          />
        ) : (
          <div className={`${compact ? "h-28 md:w-28" : "h-44 md:h-36 md:w-36"} flex w-full shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground`}>
            <MessageCircle size={22} aria-hidden="true" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{post.accountName || `${post.platform} Account`}</p>
              <h2 className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-foreground/85">
                {post.caption || `${post.platform} post`}
              </h2>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                {post.timestamp ? new Date(post.timestamp).toLocaleString() : "Imported from account"}
              </p>
            </div>
            <span className="w-fit rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              {post.platform}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4 lg:grid-cols-8">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="border-r border-border px-3 py-3 last:border-r-0">
              <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Icon size={13} aria-hidden="true" />
                {item.label}
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums text-foreground">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-sm font-semibold text-muted-foreground">Published via {post.platform}</p>
        {post.permalink ? (
          <a
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center rounded-xl border border-border px-3 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            View Post
          </a>
        ) : null}
      </div>
    </article>
  );
}
