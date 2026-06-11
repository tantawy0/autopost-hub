"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Filter, MoreHorizontal, Plus, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlatformStack } from "@/components/copied-ui/PlatformBadge";
import { StatusChip } from "@/components/copied-ui/StatusChip";
import { Button } from "@/components/ui/button";
import { SkeletonLine, SkeletonTableRows } from "@/components/copied-ui/Skeletons";
import { deletePost, listPostsByStatus, publishPostClient } from "@/lib/posts";
import { toUiPost, type UiPost, type UiPostStatus } from "@/lib/ui-repo-adapters";

const tabs: { label: string; statuses: UiPostStatus[] }[] = [
  { label: "All", statuses: ["draft","scheduled","publishing","failed"] },
  { label: "Drafts", statuses: ["draft"] },
  { label: "Scheduled", statuses: ["scheduled","publishing"] },
  { label: "Failed", statuses: ["failed"] },
];

export default function Queue() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [posts, setPosts] = useState<UiPost[]>([]);
  const load = () => listPostsByStatus(["Draft","Scheduled","Failed"]).then((items) => setPosts(items.map(toUiPost))).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  const filtered = posts.filter((post) => tabs[tab].statuses.includes(post.status));

  const publish = async (post: UiPost) => {
    try { await publishPostClient(post.id); toast.success("Publishing complete"); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to publish"); }
  };
  const remove = async (post: UiPost) => {
    if (!window.confirm("Delete this post from the queue?")) return;
    try { await deletePost(post.id); toast.success("Post deleted"); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete"); }
  };

  if (loading) return <div className="space-y-5"><div className="space-y-2"><SkeletonLine className="h-8 w-40" /><SkeletonLine className="h-3 w-64" /></div><SkeletonLine className="h-10 w-72 rounded-xl" /><div className="glass rounded-2xl p-4"><SkeletonTableRows rows={6} /></div></div>;

  return <div className="space-y-5">
    <div className="flex items-end justify-between"><div><h1 className="font-display text-3xl font-bold tracking-tight">Queue</h1><p className="text-sm text-muted-foreground">Drafts, scheduled and failed posts in one place.</p></div><div className="flex gap-2"><Button onClick={() => setTab(0)} variant="outline" size="sm" className="border-border"><Filter className="mr-1.5 h-3.5 w-3.5" /> All posts</Button><Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow"><Link href="/create"><Plus className="mr-1 h-4 w-4" /> New post</Link></Button></div></div>
    <div className="flex gap-1 rounded-xl bg-secondary p-1 w-fit">{tabs.map((item,index) => <button key={item.label} onClick={() => setTab(index)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${index===tab ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}>{item.label}</button>)}</div>
    <div className="glass rounded-2xl overflow-hidden"><div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border"><div className="col-span-5">Post</div><div className="col-span-2">Channels</div><div className="col-span-2">Scheduled</div><div className="col-span-2">Status</div><div className="col-span-1 text-right">Actions</div></div>
      {filtered.map((post) => <div key={post.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center px-5 py-4 border-b border-border last:border-0 hover:bg-secondary/30 transition"><div className="col-span-5 flex items-center gap-3 min-w-0"><div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-sky-500/30 via-cyan-500/25 to-indigo-500/25 ring-1 ring-border" /><div className="min-w-0"><div className="truncate text-sm font-medium">{post.caption || "Untitled post"}</div><div className="text-[11px] text-muted-foreground">by {post.author.name}</div></div></div><div className="col-span-2"><PlatformStack platforms={post.platforms} /></div><div className="col-span-2 text-xs">{format(new Date(post.scheduledAt), "MMM d, HH:mm")}</div><div className="col-span-2"><StatusChip status={post.status} /></div><div className="col-span-1 flex justify-end gap-1"><button title="Publish now" onClick={() => void publish(post)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><RotateCw className="h-4 w-4" /></button><button title="Delete" onClick={() => void remove(post)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button><Link title="Edit" href={`/edit-post/${post.id}`} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary"><MoreHorizontal className="h-4 w-4" /></Link></div></div>)}
      {!filtered.length && <div className="p-12 text-center text-sm text-muted-foreground">No posts in this view.</div>}
    </div>
  </div>;
}
