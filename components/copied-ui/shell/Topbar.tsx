"use client";

import { Bell, Command, Languages, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedThemeToggler } from "@/components/copied-ui/effects/AnimatedThemeToggler";
import { ButtonWithBadge } from "@/components/copied-ui/effects/ButtonWithBadge";
import { getDictionary, getShellRoutes, isRtlLocale } from "@/lib/i18n";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export function Topbar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = useUiStore((state) => state.locale);
  const toggleLocale = useUiStore((state) => state.toggleLocale);
  const dictionary = getDictionary(locale);
  const isRtl = isRtlLocale(locale);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchableRoutes = useMemo(() => getShellRoutes(locale), [locale]);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchableRoutes.slice(0, 5);
    return searchableRoutes
      .filter((route) => `${route.label} ${route.keywords}`.toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [query, searchableRoutes]);

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
        <Search className={cn("pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground", isRtl ? "right-3" : "left-3")} />
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
          className={cn("h-10 w-full rounded-xl border border-border bg-secondary/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50", isRtl ? "pl-16 pr-9 text-right" : "pl-9 pr-16")}
          placeholder={dictionary.topbar.searchPlaceholder}
          aria-label={dictionary.topbar.searchPlaceholder}
          dir={isRtl ? "rtl" : "ltr"}
        />
        <kbd className={cn("absolute top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground", isRtl ? "left-2" : "right-2")}>
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
                  className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-secondary", isRtl && "flex-row-reverse text-right")}
                >
                  <span>{result.label}</span>
                  <span className="text-[10px] text-muted-foreground">{result.href}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">{dictionary.topbar.noRoute}</div>
            )}
          </div>
        ) : null}
      </label>

      <ButtonWithBadge variant="primary" badge="AI" badgeVariant="default" asChild className="hidden md:inline-flex">
        <Link href="/create">
          <Plus className="h-4 w-4" /> {dictionary.topbar.createPost}
        </Link>
      </ButtonWithBadge>

      <ButtonWithBadge
        type="button"
        onClick={() => setNotificationsOpen((value) => !value)}
        variant="outline"
        badge="."
        badgeVariant="ai"
        className="hidden sm:inline-flex"
        aria-label={dictionary.topbar.notifications}
      >
        <Bell className="h-4 w-4" />
      </ButtonWithBadge>
      {notificationsOpen ? (
        <div className={cn("absolute top-14 z-50 w-72 rounded-2xl border border-border bg-background/95 p-3 shadow-2xl backdrop-blur-xl", isRtl ? "left-28 text-right" : "right-28")}>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{dictionary.topbar.activity}</div>
          <div className="mt-3 space-y-2">
            {dictionary.topbar.notificationsList.map((item) => (
              <div key={item} className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <ButtonWithBadge
        type="button"
        onClick={toggleLocale}
        variant="outline"
        aria-label={dictionary.switchLanguage}
        aria-pressed={locale === "ar"}
        className="inline-flex"
      >
        <Languages className="h-4 w-4" />
        <span className="text-xs font-bold">{locale === "ar" ? "EN" : "AR"}</span>
      </ButtonWithBadge>
      <AnimatedThemeToggler />
      <Link href="/ai-agent" className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 px-2 py-1.5 hover:bg-secondary transition">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-primary text-[11px] font-bold text-primary-foreground"><Sparkles className="h-4 w-4" /></div>
        <div className={cn("hidden md:block pr-1 text-left", isRtl && "pl-1 pr-0 text-right")}>
          <div className="text-xs font-semibold leading-tight">{dictionary.topbar.creatorAi}</div>
          <div className="text-[10px] text-muted-foreground">{dictionary.topbar.assistant}</div>
        </div>
      </Link>
    </header>
  );
}
