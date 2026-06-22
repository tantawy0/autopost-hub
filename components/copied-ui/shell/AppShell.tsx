"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Images, LayoutDashboard, ListChecks, PanelsTopLeft, PenSquare, Plug, Send, Settings, Sparkles } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { FloatingGuide } from "@/components/copied-ui/onboarding/FloatingGuide";
import { Dock } from "@/components/copied-ui/effects/Dock";
import { getDictionary, getDockRoutes, getMobileRoutes, isRtlLocale, type RouteIconKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/ui-store";

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

export function CopiedAppShell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const pathname = usePathname();
  const locale = useUiStore((state) => state.locale);
  const dictionary = getDictionary(locale);
  const dockItems = getDockRoutes(locale).map((item) => ({ ...item, icon: routeIcons[item.iconKey] ?? LayoutDashboard }));
  const mobileNav = getMobileRoutes(locale).map((item) => ({ ...item, icon: routeIcons[item.iconKey] ?? LayoutDashboard }));
  const isRtl = isRtlLocale(locale);

  return (
    <div className={cn("min-h-screen flex w-full", isRtl && "text-right")}>
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-32">
          {children}
        </main>
      </div>

      <div className="hidden lg:flex fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
        <Dock items={dockItems} />
      </div>

      <FloatingGuide />

      <nav aria-label={dictionary.primaryMobileNavigation} className="lg:hidden fixed bottom-3 left-3 right-3 z-40 glass-strong flex justify-around rounded-2xl px-2 py-2">
        {mobileNav.map((item) => {
          const active = item.end ? pathname === item.to || pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link key={item.to} href={item.to} className={cn("flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition", active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground")}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
