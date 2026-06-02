"use client";

import Link from "next/link";
import { type HTMLAttributes, useMemo, useState } from "react";
import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Clock3, Edit3, GripVertical, List, Plus, Send, Trash2 } from "lucide-react";

import PostCard from "@/components/posts/PostCard";
import type { Platform, PostCardDTO } from "@/lib/types";

interface CalendarViewProps {
  posts: PostCardDTO[];
  onDelete?: (post: PostCardDTO) => void;
  onPublish?: (post: PostCardDTO) => void;
  onReschedule?: (post: PostCardDTO, scheduledFor: string) => void;
  publishingId?: string;
}

type CalendarMode = "month" | "week" | "day" | "list";

const MODES: Array<{ id: CalendarMode; label: string }> = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
  { id: "list", label: "List" },
];

const PLATFORM_TONE: Record<Platform, string> = {
  Facebook: "bg-blue-400/15 text-blue-200 border-blue-300/20",
  Instagram: "bg-pink-400/15 text-pink-200 border-pink-300/20",
  TikTok: "bg-zinc-100/10 text-zinc-100 border-white/15",
  LinkedIn: "bg-sky-400/15 text-sky-200 border-sky-300/20",
};

function dateKey(date: Date) {
  return date.toDateString();
}

function formatTime(value: string | null) {
  if (!value) return "No time";

  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildDays(mode: CalendarMode) {
  const today = new Date();
  const count = mode === "day" ? 1 : mode === "week" ? 7 : 30;

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
}

function PlatformChips({ platforms }: { platforms: Platform[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {platforms.map((platform) => (
        <span key={platform} className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${PLATFORM_TONE[platform]}`}>
          {platform}
        </span>
      ))}
    </div>
  );
}

function CalendarPostCard({
  post,
  onDelete,
  onPublish,
  publishing,
  dragHandleProps,
}: {
  post: PostCardDTO;
  onDelete?: (post: PostCardDTO) => void;
  onPublish?: (post: PostCardDTO) => void;
  publishing?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLSpanElement>;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      draggable
      layout
      whileHover={reduceMotion ? undefined : { y: -2 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      className="glass-card group rounded-2xl p-3"
    >
      <div className="flex items-start gap-3">
        <span {...dragHandleProps} className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-0.5 text-zinc-600 transition group-hover:bg-white/8 group-hover:text-zinc-300">
          <GripVertical size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-black text-white">{post.caption || "Untitled post"}</p>
            <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-black text-zinc-400">
              {formatTime(post.scheduledFor)}
            </span>
          </div>
          <PlatformChips platforms={post.platforms} />
          <div className="mt-3 flex flex-wrap gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <Link href={`/edit-post/${post.id}`} className="inline-flex min-h-8 items-center gap-1 rounded-xl bg-white/[0.055] px-2 text-xs font-bold text-zinc-200 hover:bg-white/8">
              <Edit3 size={13} aria-hidden="true" />
              Edit
            </Link>
            {onPublish ? (
              <button type="button" onClick={() => onPublish(post)} className="reference-gradient-primary inline-flex min-h-8 items-center gap-1 rounded-xl px-2 text-xs font-black text-slate-950 disabled:opacity-60" disabled={publishing}>
                <Send size={13} aria-hidden="true" />
                {publishing ? "Publishing" : "Publish"}
              </button>
            ) : null}
            {onDelete ? (
              <button type="button" onClick={() => onDelete(post)} className="inline-flex min-h-8 items-center gap-1 rounded-xl bg-rose-500/90 px-2 text-xs font-bold text-white hover:bg-rose-400">
                <Trash2 size={13} aria-hidden="true" />
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function DraggableCalendarPostCard(props: {
  post: PostCardDTO;
  onDelete?: (post: PostCardDTO) => void;
  onPublish?: (post: PostCardDTO) => void;
  publishing?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `post:${props.post.id}`,
    data: { postId: props.post.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      className={isDragging ? "relative z-30 opacity-80" : undefined}
    >
      <CalendarPostCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function CalendarDayCell({
  day,
  posts,
  onDelete,
  onPublish,
  publishingId,
}: {
  day: Date;
  posts: PostCardDTO[];
  onDelete?: (post: PostCardDTO) => void;
  onPublish?: (post: PostCardDTO) => void;
  publishingId?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dateKey(day)}`, data: { date: day.toISOString() } });
  const density = Math.min(posts.length, 4);

  return (
    <section
      ref={setNodeRef}
      className={`min-h-[260px] rounded-3xl p-3 transition ${
        isOver ? "bg-sky-300/10 shadow-[0_0_40px_rgb(79_156_255_/_0.12)]" : "reference-glass"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-zinc-500">{day.toLocaleDateString([], { weekday: "short" })}</p>
          <h2 className="mt-1 text-xl font-black text-white">{day.getDate()}</h2>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((item) => (
            <span key={item} className={`h-1.5 w-4 rounded-full ${item < density ? "bg-sky-300" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {posts.length > 0 ? (
          posts.map((post) => (
            <DraggableCalendarPostCard key={post.id} post={post} onDelete={onDelete} onPublish={onPublish} publishing={publishingId === post.id} />
          ))
        ) : (
          <Link href="/create-post" aria-label={`Create post for ${day.toLocaleDateString()}`} className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-white/12 text-zinc-600 transition hover:border-sky-300/35 hover:bg-sky-300/8 hover:text-sky-200">
            <Plus size={18} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}

export default function CalendarView({ posts, onDelete, onPublish, onReschedule, publishingId }: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("week");
  const reduceMotion = useReducedMotion();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const days = useMemo(() => buildDays(mode), [mode]);
  const grouped = useMemo(() => {
    return posts.reduce<Record<string, PostCardDTO[]>>((acc, post) => {
      const key = post.scheduledFor ? dateKey(new Date(post.scheduledFor)) : "Unscheduled";
      acc[key] = acc[key] ?? [];
      acc[key].push(post);
      return acc;
    }, {});
  }, [posts]);
  const upcoming = [...posts]
    .sort((a, b) => new Date(a.scheduledFor ?? 0).getTime() - new Date(b.scheduledFor ?? 0).getTime())
    .slice(0, 6);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over?.id || !onReschedule) return;
    const targetDate = String(event.over.id).replace("day:", "");
    const post = posts.find((item) => `post:${item.id}` === event.active.id);

    if (!post) return;

    const previous = post.scheduledFor ? new Date(post.scheduledFor) : new Date();
    const next = new Date(targetDate);
    next.setHours(previous.getHours(), previous.getMinutes(), 0, 0);
    onReschedule(post, next.toISOString());
  };

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-2xl bg-white/[0.04] p-1">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`flex min-h-9 items-center gap-2 rounded-xl px-3 text-sm font-black transition ${
                  mode === item.id ? "reference-gradient-primary text-slate-950" : "text-zinc-400 hover:bg-white/8 hover:text-white"
                }`}
              >
                {item.id === "list" ? <List size={16} aria-hidden="true" /> : <CalendarDays size={16} aria-hidden="true" />}
                {item.label}
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-white/[0.045] px-3 py-2 text-xs font-bold text-zinc-400">
            {posts.length} scheduled posts
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === "list" ? (
            <motion.div key="list" className="space-y-4" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {posts.length > 0 ? (
                posts.map((post, index) => (
                  <motion.div key={post.id} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }}>
                    <PostCard post={post} onDelete={onDelete} onPublish={onPublish} publishing={publishingId === post.id} />
                  </motion.div>
                ))
              ) : (
                <div className="premium-cta-card flex min-h-[340px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-white/[0.035] p-8 text-center">
                  <CalendarDays size={26} className="text-[#d8ffd0]" aria-hidden="true" />
                  <h2 className="mt-4 text-lg font-black text-white">No scheduled posts yet</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">Schedule your first post to see it in list, day, week, and month views.</p>
                  <Link href="/create-post" className="silent-button mt-5 inline-flex min-h-10 items-center gap-2 rounded-2xl px-4 text-sm font-black">
                    <Plus size={16} aria-hidden="true" />
                    New Post
                  </Link>
                </div>
              )}
            </motion.div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <motion.div
                key={mode}
                className={`grid gap-3 ${mode === "day" ? "grid-cols-1" : mode === "week" ? "md:grid-cols-2 2xl:grid-cols-7" : "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5"}`}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {days.map((day) => (
                  <CalendarDayCell
                    key={day.toISOString()}
                    day={day}
                    posts={grouped[dateKey(day)] ?? []}
                    onDelete={onDelete}
                    onPublish={onPublish}
                    publishingId={publishingId}
                  />
                ))}
              </motion.div>
            </DndContext>
          )}
        </AnimatePresence>
      </div>

      <aside className="reference-glass rounded-2xl p-4 xl:sticky xl:top-24 xl:h-fit">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase text-zinc-300">Upcoming rail</h2>
          <Clock3 size={16} className="text-sky-300" aria-hidden="true" />
        </div>
        <div className="mt-4 space-y-3">
          {upcoming.length > 0 ? (
            upcoming.map((post) => (
              <Link key={post.id} href={`/edit-post/${post.id}`} className="block rounded-2xl bg-white/[0.04] p-3 transition hover:bg-white/[0.075]">
                <p className="line-clamp-2 text-sm font-bold text-white">{post.caption || "Untitled post"}</p>
                <p className="mt-2 text-xs font-semibold text-zinc-500">{post.scheduledFor ? new Date(post.scheduledFor).toLocaleString() : "No time"}</p>
                <PlatformChips platforms={post.platforms} />
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.035] p-4 text-sm font-semibold text-zinc-500">
              Your upcoming queue will appear here once posts are scheduled.
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}
