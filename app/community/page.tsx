"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Filter, List, MessageCircle, Plus, Radio, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import AppShell from "@/components/app-shell/AppShell";
import SocialPostCard, { getSocialPostMetrics } from "@/components/posts/SocialPostCard";
import { EmptyState } from "@/components/copied-ui/EmptyState";
import { listImportedSocialPosts } from "@/lib/social-posts";
import type { SocialPostDTO } from "@/lib/types";

type ViewMode = "By post" | "List";

export default function CommunityPage() {
  const [posts, setPosts] = useState<SocialPostDTO[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("By post");
  const [query, setQuery] = useState("");

  const loadPosts = useCallback(async () => {
    try {
      const data = await listImportedSocialPosts();
      setPosts(data);
      setSelectedId((current) => current || data[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load community posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPosts();
    });
  }, [loadPosts]);

  const visiblePosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return posts;

    return posts.filter((post) =>
      [post.caption, post.accountName, post.platform].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [posts, query]);

  const selectedPost =
    visiblePosts.find((post) => post.id === selectedId) ?? visiblePosts[0] ?? null;
  const totalComments = posts.reduce((sum, post) => sum + (getSocialPostMetrics(post).comments ?? 0), 0);

  return (
    <AppShell>
      <section className="glass overflow-hidden rounded-2xl">
        <header className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-primary/15 text-primary">
                <MessageCircle size={21} aria-hidden="true" />
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Community</h1>
                <p className="mt-1 text-sm text-muted-foreground">Track posts, comments, and conversation signals.</p>
              </div>
              <span className="ml-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/50 text-sm font-bold text-foreground">
                {totalComments}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search posts"
                className="min-h-10 w-56 rounded-xl border border-border bg-secondary/50 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <button onClick={() => setQuery("")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 text-sm font-semibold text-foreground hover:bg-secondary">
              <Filter size={16} aria-hidden="true" />
              All
            </button>
            <button onClick={() => toast.message("Comment status filters will appear after inbox sync is enabled.")} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-secondary/50 px-3 text-foreground hover:bg-secondary" aria-label="Filters">
              <SlidersHorizontal size={16} aria-hidden="true" />
            </button>
            {(["By post", "List"] as ViewMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${
                  view === item ? "bg-primary/15 text-primary" : "border border-border bg-secondary/40 text-muted-foreground"
                }`}
              >
                {item === "List" ? <List size={16} aria-hidden="true" /> : <Radio size={16} aria-hidden="true" />}
                {item}
              </button>
            ))}
          </div>
        </header>

        <div className="grid min-h-[680px] lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-border lg:border-b-0 lg:border-r lg:border-r-border">
            <div className="flex items-center justify-between border-b border-border p-4">
              <p className="text-sm font-semibold text-foreground">Posts</p>
              <span className="rounded-full bg-secondary px-2 py-1 text-xs font-bold text-muted-foreground">{visiblePosts.length}</span>
            </div>

            {loading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-xl bg-secondary/70" />
                ))}
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm font-semibold text-foreground">No posts found</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Sync Instagram posts to manage community activity.</p>
                <Link href="/published" className="mt-4 inline-flex min-h-9 items-center rounded-xl border border-border px-3 text-xs font-bold text-foreground hover:bg-secondary">
                  Show all posts
                </Link>
              </div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto p-3">
                {visiblePosts.map((post) => {
                  const metrics = getSocialPostMetrics(post);
                  const active = selectedPost?.id === post.id;

                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedId(post.id)}
                      className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                        active ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">{post.caption || "Instagram post"}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <MessageCircle size={13} aria-hidden="true" />
                        {metrics.comments ?? "-"} comments
                        <span className="ml-auto">{metrics.reactions ?? "-"} reactions</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <main className="p-4 lg:p-8">
            {loading ? (
              <div className="min-h-[520px] animate-pulse rounded-2xl bg-secondary/60" />
            ) : selectedPost ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                {view === "By post" ? (
                  <div className="mx-auto max-w-4xl">
                    <SocialPostCard post={selectedPost} />
                    <div className="mt-4 rounded-2xl border border-border bg-secondary/30 p-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Radio size={22} aria-hidden="true" />
                        </span>
                        <div>
                          <h2 className="font-semibold text-foreground">Listening for new comments</h2>
                          <p className="mt-1 text-sm text-muted-foreground">New comments and replies will appear here when synced.</p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <Link href="/create" className="rounded-xl border border-border bg-secondary/40 p-4 transition hover:bg-secondary">
                          <p className="font-semibold text-foreground">Post something new</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">Create content that invites comments and replies.</p>
                        </Link>
                        <Link href="/channels" className="rounded-xl border border-border bg-secondary/40 p-4 transition hover:bg-secondary">
                          <p className="flex items-center gap-2 font-semibold text-foreground"><Plus size={16} /> Connect more channels</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">Manage conversations from every connected account.</p>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visiblePosts.map((post) => (
                      <SocialPostCard key={post.id} post={post} compact />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <EmptyState
                icon={<Radio size={22} aria-hidden="true" />}
                title="We're listening for new comments"
                description="Sync account posts first. Comments and community signals will appear here."
              />
            )}
          </main>
        </div>
      </section>
    </AppShell>
  );
}
