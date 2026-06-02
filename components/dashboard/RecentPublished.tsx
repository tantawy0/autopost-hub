import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import EmptyState from "@/components/ui/EmptyState";
import StatusPill from "@/components/ui/StatusPill";
import type { PostCardDTO } from "@/lib/types";

interface RecentPublishedProps {
  posts: PostCardDTO[];
}

export default function RecentPublished({ posts }: RecentPublishedProps) {
  return (
    <section className="app-panel-soft rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Recent Outcomes</h2>
          <p className="text-sm text-zinc-400">Published, partial, and failed results</p>
        </div>
        <Link href="/published" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
          Review
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No publishing outcomes yet"
          description="Published, partially published, and failed posts will appear here after processing."
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-lg border border-white/10 bg-zinc-950/45 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 font-semibold text-white">{post.caption || "Untitled post"}</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : "No publish time"}
                  </p>
                </div>
                <StatusPill status={post.status} />
              </div>
              {post.failureSummary ? (
                <p className="mt-3 text-sm leading-6 text-rose-200">{post.failureSummary}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
