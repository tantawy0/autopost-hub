"use client";

import { Bell, Command, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedThemeToggler } from "@/components/copied-ui/effects/AnimatedThemeToggler";
import { ButtonWithBadge } from "@/components/copied-ui/effects/ButtonWithBadge";

const searchableRoutes = [
  { label: "Dashboard", href: "/dashboard", keywords: "home overview growth" },
  { label: "Create post", href: "/create", keywords: "compose publish schedule draft" },
  { label: "Calendar", href: "/calendar", keywords: "plan scheduled posts" },
  { label: "Queue", href: "/queue", keywords: "drafts scheduled failed" },
  { label: "Published", href: "/published", keywords: "sent live history" },
  { label: "Analytics", href: "/analytics", keywords: "metrics reach engagement reports" },
  { label: "Channels", href: "/channels", keywords: "connect meta instagram facebook linkedin" },
  { label: "Pages", href: "/pages", keywords: "facebook pages instagram linked assets" },
  { label: "AI Assistant", href: "/ai-agent", keywords: "rewrite caption assistant ideas" },
  { label: "Media Library", href: "/media", keywords: "upload assets images videos" },
  { label: "Settings", href: "/settings", keywords: "billing team workspace integrations" },
];

export function Topbar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchableRoutes.slice(0, 5);
    return searchableRoutes
      .filter((route) => `${route.label} ${route.keywords}`.toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const goTo = (href: string) => {
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl lg:px-6">
      <label className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) goTo(results[0].href);
          }}
          className="h-10 w-full rounded-xl border border-border bg-secondary/60 pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          placeholder="Search posts, channels, drafts..."
        />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
        {searchOpen ? (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-background/95 p-2 shadow-2xl backdrop-blur-xl">
            {results.length ? (
              results.map((result) => (
                <button
                  key={result.href}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => goTo(result.href)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-secondary"
                >
                  <span>{result.label}</span>
                  <span className="text-[10px] text-muted-foreground">{result.href}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">No matching workspace route.</div>
            )}
          </div>
        ) : null}
      </label>

      <ButtonWithBadge variant="primary" badge="AI" badgeVariant="default" asChild className="hidden md:inline-flex">
        <Link href="/create">
          <Plus className="h-4 w-4" /> Create post
        </Link>
      </ButtonWithBadge>

      <ButtonWithBadge
        type="button"
        onClick={() => setNotificationsOpen((value) => !value)}
        variant="outline"
        badge="."
        badgeVariant="ai"
        className="hidden sm:inline-flex"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </ButtonWithBadge>
      {notificationsOpen ? (
        <div className="absolute right-28 top-14 z-50 w-72 rounded-2xl border border-border bg-background/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</div>
          <div className="mt-3 space-y-2">
            {["Scheduler is watching due posts.", "AI fallback is available.", "Media storage is connected."].map((item) => (
              <div key={item} className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <AnimatedThemeToggler />
      <Link href="/ai-agent" className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-2 py-1.5 hover:bg-secondary transition">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-primary text-[11px] font-bold text-primary-foreground"><Sparkles className="h-4 w-4" /></div>
        <div className="hidden md:block pr-1 text-left">
          <div className="text-xs font-semibold leading-tight">Creator AI</div>
          <div className="text-[10px] text-muted-foreground">Assistant</div>
        </div>
      </Link>
    </header>
  );
}
