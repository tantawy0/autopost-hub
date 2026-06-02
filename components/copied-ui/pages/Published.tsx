"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Eye, Filter, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformStack } from "@/components/copied-ui/PlatformBadge";
import { StatusChip } from "@/components/copied-ui/StatusChip";
import { SkeletonLine } from "@/components/copied-ui/Skeletons";
import { listPostsByStatus } from "@/lib/posts";
import { listImportedSocialPosts } from "@/lib/social-posts";
import { toUiImportedPost, toUiPost, type UiPost } from "@/lib/ui-repo-adapters";
import MediaPreview from "@/components/posts/MediaPreview";

export default function Published() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<UiPost[]>([]);
  useEffect(() => { void Promise.all([listPostsByStatus(["Published","Partially Published","Failed"]), listImportedSocialPosts()]).then(([local, imported]) => setPosts([...imported.map(toUiImportedPost), ...local.map(toUiPost)])).catch(() => { setPosts([]); }).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="space-y-5"><div className="space-y-2"><SkeletonLine className="h-8 w-40" /><SkeletonLine className="h-3 w-64" /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:6}).map((_,i) => <div key={i} className="glass rounded-2xl overflow-hidden"><SkeletonLine className="aspect-[4/3] w-full rounded-none" /><div className="p-4 space-y-3"><SkeletonLine className="h-3 w-5/6" /><SkeletonLine className="h-3 w-2/3" /></div></div>)}</div></div>;
  return <div className="space-y-5"><div className="flex items-end justify-between"><div><h1 className="font-display text-3xl font-bold tracking-tight">Published</h1><p className="text-sm text-muted-foreground">Recent posts and their performance.</p></div><Button variant="outline" size="sm" className="border-border"><Filter className="mr-1.5 h-3.5 w-3.5" /> Filter</Button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{posts.map((post) => <div key={post.id} className="glass gradient-border rounded-2xl overflow-hidden hover-lift"><div className="aspect-[4/3] bg-gradient-to-br from-sky-500/30 via-cyan-500/25 to-indigo-500/25 ring-grid relative">{post.media ? <MediaPreview media={{url:post.media,mediaType:"unknown"}} className="absolute inset-0" /> : null}<div className="absolute top-3 left-3"><PlatformStack platforms={post.platforms} /></div><div className="absolute top-3 right-3"><StatusChip status={post.status} /></div></div><div className="p-4 space-y-3"><p className="text-sm line-clamp-2">{post.caption || "Published post"}</p><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>by {post.author.name}</span><span>{post.scheduledAt ? format(new Date(post.scheduledAt), "MMM d, yyyy") : "Unknown date"}</span></div><div className="grid grid-cols-3 gap-2 pt-2 border-t border-border"><Stat icon={Eye} label="Reach" value={post.stats?.reach ?? "Synced"} /><Stat icon={Heart} label="Eng." value={post.stats?.engagement ?? "Synced"} /><Stat icon={MessageCircle} label="Clicks" value={post.stats?.clicks ?? "Synced"} /></div></div></div>)}</div>
    {!posts.length ? <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">No published posts yet.</div> : null}
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string | number }) {
  return <div className="text-center"><Icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" /><div className="mt-0.5 text-sm font-bold">{value}</div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div></div>;
}
