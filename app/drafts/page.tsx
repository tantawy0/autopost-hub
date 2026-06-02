"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";

import AppShell from "@/components/app-shell/AppShell";
import PostCard from "@/components/posts/PostCard";
import PostFilters from "@/components/posts/PostFilters";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { deletePost, listPostsByStatus } from "@/lib/posts";
import type { PostCardDTO, PostStatus } from "@/lib/types";

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<PostCardDTO[]>([]);
  const [filter, setFilter] = useState<PostStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<PostCardDTO | null>(null);

  const loadDrafts = useCallback(async () => {
    try {
      setDrafts(await listPostsByStatus(["Draft"]));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load drafts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadDrafts();
    });
  }, [loadDrafts]);

  const visibleDrafts = useMemo(() => {
    if (filter === "All") return drafts;
    return drafts.filter((draft) => draft.status === filter);
  }, [drafts, filter]);

  const handleDelete = async () => {
    if (!pendingDelete) return;

    try {
      await deletePost(pendingDelete.id);
      toast.success("Draft deleted");
      setPendingDelete(null);
      await loadDrafts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete draft");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Drafts</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Review, edit, delete, or schedule saved draft content.
            </p>
          </div>
          <Link
            href="/create-post"
            className="silent-button inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black"
          >
            <Plus size={18} aria-hidden="true" />
            Create Draft
          </Link>
        </div>

        <PostFilters value={filter} onChange={setFilter} options={["All", "Draft"]} />

        {loading ? (
          <div className="glass-card flex min-h-[360px] flex-col items-center justify-center rounded-3xl text-zinc-300">
            <span className="silent-loader" aria-hidden="true" />
            <p className="mt-5 text-sm font-semibold">Loading drafts...</p>
          </div>
        ) : visibleDrafts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No drafts yet"
            description="Save unfinished content as a draft and come back when it is ready to schedule."
          />
        ) : (
          <div className="space-y-4">
            {visibleDrafts.map((draft) => (
              <PostCard key={draft.id} post={draft} onDelete={setPendingDelete} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete draft"
        description="This draft will be permanently removed from your account."
        confirmLabel="Delete draft"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </AppShell>
  );
}
