"use client";

import { useEffect, useState } from "react";
import { Eye, Filter, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformStack } from "@/components/copied-ui/PlatformBadge";
import { StatusChip } from "@/components/copied-ui/StatusChip";
import { SkeletonLine } from "@/components/copied-ui/Skeletons";
import { listPostsByStatus } from "@/lib/posts";
import { listImportedSocialPosts } from "@/lib/social-posts";
import { toUiImportedPost, toUiPost, type UiPost } from "@/lib/ui-repo-adapters";
import MediaPreview from "@/components/posts/MediaPreview";
import { useUiStore } from "@/lib/ui-store";
import { formatAppDate, getPageCopy, formatAppNumber } from "@/lib/page-copy";

export default function Published() {
  const locale = useUiStore((state) => state.locale);
  const copy = getPageCopy(locale);
  const t = copy.published;
  const common = copy.common;
  const [loading, setLoading] = useState(true);
  const [showFailed, setShowFailed] = useState(true);
  const [posts, setPosts] = useState<UiPost[]>([]);
  useEffect(() => { void Promise.all([listPostsByStatus(["Published","Partially Published","Failed"]), listImportedSocialPosts()]).then(([local, imported]) => setPosts([...imported.map(toUiImportedPost), ...local.map(toUiPost)])).catch(() => { setPosts([]); }).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="space-y-5"><div className="space-y-2"><SkeletonLine className="h-8 w-40" /><SkeletonLine className="h-3 w-64" /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:6}).map((_,i) => <div key={i} className="glass rounded-2xl overflow-hidden"><SkeletonLine className="aspect-[4/3] w-full rounded-none" /><div className="p-4 space-y-3"><SkeletonLine className="h-3 w-5/6" /><SkeletonLine className="h-3 w-2/3" /></div></div>)}</div></div>;
  const visiblePosts = showFailed ? posts : posts.filter((post) => post.status !== "failed");
  return <div className="space-y-5"><div className="flex items-end justify-between"><div><h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1><p className="text-sm text-muted-foreground">{t.subtitle}</p></div><Button onClick={() => setShowFailed((value) => !value)} variant="outline" size="sm" className="border-border"><Filter className="mr-1.5 h-3.5 w-3.5" /> {showFailed ? common.hideFailed : common.showAll}</Button></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visiblePosts.map((post) => <div key={post.id} className="glass gradient-border rounded-2xl overflow-hidden hover-lift"><div className="aspect-[4/3] bg-gradient-to-br from-sky-500/30 via-cyan-500/25 to-indigo-500/25 ring-grid relative">{post.media ? <MediaPreview media={{url:post.media,mediaType:"unknown"}} className="absolute inset-0" /> : null}<div className="absolute top-3 left-3"><PlatformStack platforms={post.platforms} /></div><div className="absolute top-3 right-3"><StatusChip status={post.status} /></div></div><div className="p-4 space-y-3"><p className="text-sm line-clamp-2">{post.caption || t.fallbackPost}</p><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{common.by} {post.author.name}</span><span>{post.scheduledAt ? formatAppDate(post.scheduledAt, locale, "MMM d, yyyy", "d MMM، yyyy") : common.unknownDate}</span></div><div className="grid grid-cols-3 gap-2 pt-2 border-t border-border"><Stat icon={Eye} label={common.reach} value={post.stats?.reach ?? common.synced} /><Stat icon={Heart} label={common.engagement} value={post.stats?.engagement ?? common.synced} /><Stat icon={MessageCircle} label={common.clicks} value={post.stats?.clicks ?? common.synced} /></div></div></div>)}</div>
    {!visiblePosts.length ? <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">{t.noPosts}</div> : null}
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string | number }) {
  const locale = useUiStore((state) => state.locale);
  const displayValue = typeof value === "number" ? formatAppNumber(value, locale) : value;
  return <div className="text-center"><Icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" /><div className="mt-0.5 text-sm font-bold">{displayValue}</div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div></div>;
}
