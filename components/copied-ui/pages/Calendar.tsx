"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { PlatformBadge, PlatformStack } from "@/components/copied-ui/PlatformBadge";
import { SkeletonLine } from "@/components/copied-ui/Skeletons";
import { listPostsByStatus } from "@/lib/posts";
import { toUiPost, type UiPost } from "@/lib/ui-repo-adapters";
import { useUiStore } from "@/lib/ui-store";
import { formatAppDate, getPageCopy } from "@/lib/page-copy";

const views = ["Month", "Week", "List"] as const;
type CalendarView = (typeof views)[number];

function postDate(post: UiPost) {
  return new Date(post.scheduledAt);
}

function sortBySchedule(posts: UiPost[]) {
  return [...posts].sort((a, b) => postDate(a).getTime() - postDate(b).getTime());
}

function dateRangeLabel(days: Date[], locale: "en" | "ar") {
  const first = days[0];
  const last = days[days.length - 1];

  if (!first || !last) return "";
  if (first.getMonth() === last.getMonth()) {
    return `${formatAppDate(first, locale, "MMMM d", "d MMMM")} - ${formatAppDate(last, locale, "d, yyyy", "d، yyyy")}`;
  }

  return `${formatAppDate(first, locale, "MMM d", "d MMM")} - ${formatAppDate(last, locale, "MMM d, yyyy", "d MMM، yyyy")}`;
}

export default function Calendar() {
  const locale = useUiStore((state) => state.locale);
  const copy = getPageCopy(locale);
  const t = copy.calendar;
  const common = copy.common;
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<UiPost[]>([]);
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<CalendarView>("Month");
  const [selectedDay, setSelectedDay] = useState(new Date());

  useEffect(() => {
    void listPostsByStatus(["Scheduled"])
      .then((items) => setPosts(items.map(toUiPost)))
      .finally(() => setLoading(false));
  }, []);

  const monthDays = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(startOfWeek(startOfMonth(cursor)), index)),
    [cursor],
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(selectedDay), index)),
    [selectedDay],
  );
  const listedPosts = useMemo(() => sortBySchedule(posts), [posts]);

  const postsForDay = (day: Date) => posts.filter((post) => isSameDay(postDate(post), day));
  const selectedPosts = postsForDay(selectedDay);
  const visibleTitle = view === "Week" ? dateRangeLabel(weekDays, locale) : formatAppDate(cursor, locale, "MMMM yyyy", "MMMM yyyy");

  const moveBackward = () => {
    if (view === "Week") {
      const next = addDays(selectedDay, -7);
      setSelectedDay(next);
      setCursor(next);
      return;
    }

    setCursor(addMonths(cursor, -1));
  };

  const moveForward = () => {
    if (view === "Week") {
      const next = addDays(selectedDay, 7);
      setSelectedDay(next);
      setCursor(next);
      return;
    }

    setCursor(addMonths(cursor, 1));
  };

  const goToday = () => {
    const today = new Date();
    setCursor(today);
    setSelectedDay(today);
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <SkeletonLine className="h-8 w-48" />
          <SkeletonLine className="h-3 w-72" />
        </div>
        <div className="glass space-y-3 rounded-2xl p-4">
          <div className="flex justify-between">
            <SkeletonLine className="h-6 w-40" />
            <SkeletonLine className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }).map((_, index) => (
              <SkeletonLine key={index} className="h-[90px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={goToday} variant="outline" size="sm" className="border-border">
            <Filter className="mr-1.5 h-3.5 w-3.5" /> {t.today}
          </Button>
          <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Link href="/create">
              <Plus className="mr-1 h-4 w-4" /> {common.newPost}
            </Link>
          </Button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={moveBackward} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary" aria-label={t.previous}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="font-display text-xl font-semibold">{visibleTitle}</div>
            <button onClick={moveForward} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary" aria-label={t.next}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-0.5 rounded-lg bg-secondary p-0.5 text-xs">
            {views.map((name) => (
              <button
                key={name}
                onClick={() => setView(name)}
                className={`rounded-md px-3 py-1.5 transition ${view === name ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
              >
                {t.views[name]}
              </button>
            ))}
          </div>
        </div>

        {view === "Month" ? (
          <CalendarGrid days={monthDays} cursor={cursor} selectedDay={selectedDay} postsForDay={postsForDay} onSelectDay={setSelectedDay} />
        ) : null}

        {view === "Week" ? (
          <WeekView days={weekDays} postsForDay={postsForDay} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        ) : null}

        {view === "List" ? <ListView posts={listedPosts} /> : null}
      </div>

      {view !== "List" ? (
        <div className="glass rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.selectedDay}</div>
              <div className="font-display text-xl font-semibold">{formatAppDate(selectedDay, locale, "EEEE, MMMM d", "EEEE، d MMMM")}</div>
            </div>
            <Button size="sm" asChild className="bg-gradient-primary text-primary-foreground">
              <Link href="/create">
                <Plus className="mr-1 h-3.5 w-3.5" /> {common.addPost}
              </Link>
            </Button>
          </div>
          {selectedPosts.length === 0 ? (
            <EmptyDay />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {selectedPosts.map((post) => (
                <PostLinkCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CalendarGrid({
  days,
  cursor,
  selectedDay,
  postsForDay,
  onSelectDay,
}: {
  days: Date[];
  cursor: Date;
  selectedDay: Date;
  postsForDay: (day: Date) => UiPost[];
  onSelectDay: (day: Date) => void;
}) {
  return (
    <>
      <WeekHeader />
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const items = postsForDay(day);
          const inMonth = day.getMonth() === cursor.getMonth();
          const selected = isSameDay(day, selectedDay);
          const today = isSameDay(day, new Date());

          return (
            <motion.button
              key={day.toISOString()}
              whileHover={{ scale: 1.01 }}
              onClick={() => onSelectDay(day)}
              className={`relative min-h-[90px] rounded-xl border p-2 text-left transition ${selected ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/20 hover:bg-secondary/40"} ${!inMonth ? "opacity-40" : ""}`}
            >
              <DayNumber day={day} today={today} />
              <MiniPostStack posts={items} />
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

function WeekView({
  days,
  selectedDay,
  postsForDay,
  onSelectDay,
}: {
  days: Date[];
  selectedDay: Date;
  postsForDay: (day: Date) => UiPost[];
  onSelectDay: (day: Date) => void;
}) {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).calendar;
  const common = getPageCopy(locale).common;
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((day) => {
        const items = sortBySchedule(postsForDay(day));
        const selected = isSameDay(day, selectedDay);
        const today = isSameDay(day, new Date());

        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className={`min-h-[220px] rounded-2xl border p-3 text-left transition ${selected ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/20 hover:bg-secondary/40"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{formatAppDate(day, locale, "EEE", "EEE")}</div>
                <DayNumber day={day} today={today} />
              </div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{items.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {items.slice(0, 5).map((post) => (
                <div key={post.id} className="rounded-xl border border-border bg-background/50 p-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{formatAppDate(postDate(post), locale, "HH:mm")}</span>
                    <PlatformStack platforms={post.platforms} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-foreground/85">{post.caption || common.untitledPost}</p>
                </div>
              ))}
              {items.length > 5 ? <div className="text-[10px] text-muted-foreground">{t.more(items.length - 5)}</div> : null}
              {!items.length ? <div className="mt-8 text-center text-xs text-muted-foreground">{t.noPosts}</div> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ListView({ posts }: { posts: UiPost[] }) {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).calendar;
  const common = getPageCopy(locale).common;
  if (!posts.length) return <EmptyDay />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="hidden grid-cols-12 gap-4 border-b border-border bg-secondary/30 px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground md:grid">
        <div className="col-span-5">{t.tablePost}</div>
        <div className="col-span-3">{t.tableChannels}</div>
        <div className="col-span-2">{t.tableDate}</div>
        <div className="col-span-2">{t.tableTime}</div>
      </div>
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/edit-post/${post.id}`}
          className="grid gap-3 border-b border-border px-4 py-4 transition last:border-b-0 hover:bg-secondary/30 md:grid-cols-12 md:items-center md:gap-4"
        >
          <div className="min-w-0 md:col-span-5">
            <p className="truncate text-sm font-medium">{post.caption || common.untitledPost}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{common.by} {post.author.name}</p>
          </div>
          <div className="md:col-span-3">
            <PlatformStack platforms={post.platforms} />
          </div>
          <div className="text-xs text-muted-foreground md:col-span-2">{formatAppDate(postDate(post), locale, "MMM d, yyyy", "d MMM، yyyy")}</div>
          <div className="text-xs font-semibold md:col-span-2">{formatAppDate(postDate(post), locale, "HH:mm")}</div>
        </Link>
      ))}
    </div>
  );
}

function WeekHeader() {
  const locale = useUiStore((state) => state.locale);
  const headers = getPageCopy(locale).calendar.headers;
  return (
    <div className="mb-1 grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
      {headers.map((day) => (
        <div key={day} className="px-2 py-1">
          {day}
        </div>
      ))}
    </div>
  );
}

function DayNumber({ day, today }: { day: Date; today: boolean }) {
  const locale = useUiStore((state) => state.locale);
  return (
    <div className={`text-xs font-semibold ${today ? "inline-grid h-5 w-5 place-items-center rounded-full bg-gradient-primary text-primary-foreground" : ""}`}>
      {formatAppDate(day, locale, "d")}
    </div>
  );
}

function MiniPostStack({ posts }: { posts: UiPost[] }) {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).calendar;
  return (
    <div className="mt-1.5 space-y-1">
      {posts.slice(0, 3).map((post) => (
        <div key={post.id} className="flex items-center gap-1 truncate text-[10px]">
          <PlatformBadge platform={post.platforms[0] ?? "facebook"} size="xs" />
          <span className="truncate text-foreground/80">{post.caption.slice(0, 18)}...</span>
        </div>
      ))}
      {posts.length > 3 ? <div className="text-[9px] text-muted-foreground">{t.more(posts.length - 3)}</div> : null}
    </div>
  );
}

function PostLinkCard({ post }: { post: UiPost }) {
  const locale = useUiStore((state) => state.locale);
  const common = getPageCopy(locale).common;
  return (
    <Link href={`/edit-post/${post.id}`} className="rounded-xl border border-border bg-secondary/30 p-4 hover-lift">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatAppDate(postDate(post), locale, "HH:mm")}</span>
        <PlatformStack platforms={post.platforms} />
      </div>
      <p className="mt-2 text-sm">{post.caption}</p>
      <div className="mt-3 text-[11px] text-muted-foreground">{common.by} {post.author.name}</div>
    </Link>
  );
}

function EmptyDay() {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).calendar;
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-10 text-center">
      <div className="font-semibold">{t.nothingScheduled}</div>
      <p className="mt-1 text-sm text-muted-foreground">{t.emptyBody}</p>
    </div>
  );
}
