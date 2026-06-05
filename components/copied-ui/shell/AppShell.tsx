"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { LayoutDashboard, CalendarDays, PenSquare, BarChart3, Sparkles, Images, Settings, PanelsTopLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dock } from "@/components/copied-ui/effects/Dock";

const dockItems = [
  { to: "/create", label: "Create", icon: PenSquare },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/pages", label: "Pages", icon: PanelsTopLeft },
  { to: "/ai-agent", label: "AI Assistant", icon: Sparkles },
  { to: "/media", label: "Media", icon: Images },
  { to: "/settings", label: "Settings", icon: Settings },
];

const mobileNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/create", label: "Create", icon: PenSquare },
  { to: "/analytics", label: "Stats", icon: BarChart3 },
  { to: "/pages", label: "Pages", icon: PanelsTopLeft },
];

export function CopiedAppShell({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex w-full">
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

      <nav aria-label="Primary mobile" className="lg:hidden fixed bottom-3 left-3 right-3 z-40 glass-strong flex justify-around rounded-2xl px-2 py-2">
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
