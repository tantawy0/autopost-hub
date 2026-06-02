"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, PenSquare, CalendarDays, ListChecks, Send, BarChart3,
  Plug, Sparkles, Images, Settings, ChevronsUpDown, Check, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "../Logo";
import { motion } from "framer-motion";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/create", label: "Create", icon: PenSquare },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/queue", label: "Queue", icon: ListChecks },
  { to: "/published", label: "Published", icon: Send },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/channels", label: "Channels", icon: Plug },
  { to: "/ai-agent", label: "AI Assistant", icon: Sparkles },
  { to: "/media", label: "Media Library", icon: Images },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
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

      <Link href="/settings" className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 py-2.5 text-left hover:bg-sidebar-accent transition">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-[11px] font-bold text-primary-foreground">OS</div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-semibold">Creator OS</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Silent Mode · Live</div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </Link>

      <nav aria-label="Primary" className="mt-4 flex-1 space-y-0.5 px-3 overflow-y-auto">
        {nav.map((item) => {
          const active = item.end ? pathname === item.to || pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
              {item.label === "AI Assistant" && showAiBadge && (
                <span onClick={dismissAiBadge} className="relative ml-auto cursor-pointer rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent hover:bg-accent/30">New</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-sidebar-border bg-gradient-card p-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Check className="h-3.5 w-3.5 text-success" /> Live stack active
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Publishing, storage, scheduler and AI fallback connected.</p>
      </div>
      <button type="button" onClick={onLogout} className="mx-3 mb-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground">
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </aside>
  );
}
