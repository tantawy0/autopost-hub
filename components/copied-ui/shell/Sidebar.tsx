"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronsUpDown,
  Images,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PanelsTopLeft,
  PenSquare,
  Plug,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDictionary, getShellRoutes, isRtlLocale, type RouteIconKey } from "@/lib/i18n";
import { useUiStore } from "@/lib/ui-store";
import { Logo } from "../Logo";
import { motion } from "framer-motion";

const routeIcons = {
  dashboard: LayoutDashboard,
  create: PenSquare,
  calendar: CalendarDays,
  queue: ListChecks,
  published: Send,
  analytics: BarChart3,
  channels: Plug,
  pages: PanelsTopLeft,
  ai: Sparkles,
  media: Images,
  settings: Settings,
} satisfies Record<RouteIconKey, React.ComponentType<{ className?: string }>>;

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const locale = useUiStore((state) => state.locale);
  const dictionary = getDictionary(locale);
  const nav = getShellRoutes(locale);
  const isRtl = isRtlLocale(locale);
  const [showAiBadge, setShowAiBadge] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setShowAiBadge(!localStorage.getItem("sidebar:ai-badge-dismissed"));
    });
  }, []);
  const dismissAiBadge = () => { localStorage.setItem("sidebar:ai-badge-dismissed", "1"); setShowAiBadge(false); };
  return (
    <aside className="hidden lg:flex h-screen sticky top-0 w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/90 backdrop-blur-xl">
      <div className="flex h-16 items-center px-5 border-b border-sidebar-border">
        <Logo />
      </div>

      <Link href="/settings" className={cn("mx-3 mt-3 flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 py-2.5 text-left hover:bg-sidebar-accent transition", isRtl && "flex-row-reverse text-right")}>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-[11px] font-bold text-primary-foreground">OS</div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-semibold">{dictionary.workspaceName}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{dictionary.workspaceStatus}</div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </Link>

      <nav aria-label={dictionary.primaryNavigation} className="mt-4 flex-1 space-y-0.5 px-3 overflow-y-auto">
        {nav.map((item) => {
          const active = item.end ? pathname === item.to || pathname === "/" : pathname.startsWith(item.to);
          const Icon = routeIcons[item.iconKey];
          return (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isRtl && "flex-row-reverse text-right",
                active ? "text-foreground" : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent/60",
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-accent border border-sidebar-border"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn("relative h-4 w-4", active && "text-primary")} />
              <span className="relative">{item.label}</span>
              {item.to === "/ai-agent" && showAiBadge && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    dismissAiBadge();
                  }}
                  className={cn("relative rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent hover:bg-accent/30", isRtl ? "mr-auto" : "ml-auto")}
                  aria-label={dictionary.guide.close}
                >
                  {dictionary.newBadge}
                </button>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-sidebar-border bg-gradient-card p-4">
        <div className={cn("flex items-center gap-2 text-xs font-semibold", isRtl && "flex-row-reverse")}>
          <Check className="h-3.5 w-3.5 text-success" /> {dictionary.liveStackTitle}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{dictionary.liveStackBody}</p>
      </div>
      <button type="button" onClick={onLogout} className={cn("mx-3 mb-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground", isRtl && "flex-row-reverse")}>
        <LogOut className="h-4 w-4" /> {dictionary.logout}
      </button>
    </aside>
  );
}
