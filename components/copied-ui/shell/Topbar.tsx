"use client";

import { Bell, Command, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { AnimatedThemeToggler } from "@/components/copied-ui/effects/AnimatedThemeToggler";
import { ButtonWithBadge } from "@/components/copied-ui/effects/ButtonWithBadge";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl lg:px-6">
      <label className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input className="h-10 w-full rounded-xl border border-border bg-secondary/60 pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50" placeholder="Search posts, channels, drafts..." />
        <kbd className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </label>

      <ButtonWithBadge variant="primary" badge="AI" badgeVariant="default" asChild className="hidden md:inline-flex">
        <Link href="/create">
          <Plus className="h-4 w-4" /> Create post
        </Link>
      </ButtonWithBadge>

      <ButtonWithBadge variant="outline" badge="." badgeVariant="ai" className="hidden sm:inline-flex" aria-label="Notifications">
        <Bell className="h-4 w-4" />
      </ButtonWithBadge>
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
