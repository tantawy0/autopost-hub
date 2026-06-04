"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Filter, List, MessageCircle, Plus, Radio, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import AppShell from "@/components/app-shell/AppShell";
import SocialPostCard, { getSocialPostMetrics } from "@/components/posts/SocialPostCard";
import EmptyState from "@/components/ui/EmptyState";
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
      <section className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
        <header className="flex flex-col gap-4 border-b border-white/10 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/6 text-[#bde5ad]">
                <MessageCircle size={21} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-white">Community</h1>
                <p className="mt-1 text-sm text-zinc-400">Track posts, comments, and conversation signals.</p>
              </div>
              <span className="ml-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-black text-white">
                {totalComments}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search posts"
                className="min-h-10 w-56 rounded-lg border border-white/10 bg-zinc-950/50 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#93c47d]"
              />
            </div>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-black text-zinc-200 hover:bg-white/8">
              <Filter size={16} aria-hidden="true" />
              All
            </button>
            <button className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-zinc-200 hover:bg-white/8" aria-label="Filters">
              <SlidersHorizontal size={16} aria-hidden="true" />
            </button>
            {(["By post", "List"] as ViewMode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-black ${
                  view === item ? "bg-[#93c47d]/20 text-[#d5f4cb]" : "border border-white/10 bg-white/5 text-zinc-300"
                }`}
              >
                {item === "List" ? <List size={16} aria-hidden="true" /> : <Radio size={16} aria-hidden="true" />}
                {item}
              </button>
            ))}
          </div>
        </header>

        <div className="grid min-h-[680px] lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-white/10 lg:border-b-0 lg:border-r lg:border-r-white/10">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <p className="text-sm font-black text-white">Posts</p>
              <span className="rounded-full bg-white/8 px-2 py-1 text-xs font-black text-zinc-300">{visiblePosts.length}</span>
            </div>

            {loading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-lg bg-white/7" />
                ))}
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm font-black text-white">No posts found</p>
                <p className="mt-2 text-xs leading-5 text-zinc-400">Sync Instagram posts to manage community activity.</p>
                <Link href="/published" className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-black text-white hover:bg-white/8">
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
                      className={`mb-2 w-full rounded-lg border p-3 text-left transition ${
                        active ? "border-[#93c47d]/50 bg-[#93c47d]/12" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-bold text-white">{post.caption || "Instagram post"}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-zinc-400">
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
              <div className="min-h-[520px] animate-pulse rounded-lg bg-white/6" />
            ) : selectedPost ? (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
                {view === "By post" ? (
                  <div className="mx-auto max-w-4xl">
                    <SocialPostCard post={selectedPost} />
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#93c47d]/18 text-[#c9efbd]">
                          <Radio size={22} aria-hidden="true" />
                        </span>
                        <div>
                          <h2 className="font-black text-white">Listening for new comments</h2>
                          <p className="mt-1 text-sm text-zinc-400">New comments and replies will appear here when synced.</p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        <Link href="/create" className="rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/8">
                          <p className="font-black text-white">Post something new</p>
                          <p className="mt-2 text-sm leading-6 text-zinc-400">Create content that invites comments and replies.</p>
                        </Link>
                        <Link href="/channels" className="rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/8">
                          <p className="flex items-center gap-2 font-black text-white"><Plus size={16} /> Connect more channels</p>
                          <p className="mt-2 text-sm leading-6 text-zinc-400">Manage conversations from every connected account.</p>
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
                icon={Radio}
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
