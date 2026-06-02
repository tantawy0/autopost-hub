import Link from "next/link";
import { CalendarClock, Pencil } from "lucide-react";

import MediaPreview from "@/components/posts/MediaPreview";
import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/ui/StatusPill";
import type { PostCardDTO } from "@/lib/types";

interface ScheduledQueueProps {
  posts: PostCardDTO[];
}

export default function ScheduledQueue({ posts }: ScheduledQueueProps) {
  return (
    <section className="app-panel-soft rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Scheduled Queue</h2>
          <p className="text-sm text-zinc-400">Upcoming content and destination health</p>
        </div>
        <Link href="/calendar" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          View all
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No scheduled posts"
          description="Schedule content from the composer and it will appear here with destination status."
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-lg border border-white/10 bg-zinc-950/45 p-4 transition hover:border-white/18 hover:bg-white/6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {(post.media[0] || post.imageUrl) ? (
                  <MediaPreview
                    media={post.media[0] ?? { url: post.imageUrl!, mediaType: "unknown" }}
                    className="h-28 w-full shrink-0 rounded-lg sm:w-28"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="line-clamp-2 font-semibold text-white">
                        {post.caption || "Untitled post"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {post.scheduledFor
                          ? new Date(post.scheduledFor).toLocaleString()
                          : "No schedule time"}
                      </p>
                    </div>
                    <StatusPill status={post.status} />
                  </div>
                  {post.failureSummary ? (
                    <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                      {post.failureSummary}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {post.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-zinc-200"
                      >
                        {platform}
                      </span>
                    ))}
                    <Link
                      href={`/edit-post/${post.id}`}
                      className="ml-auto inline-flex min-h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-emerald-300 hover:bg-white/8"
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
