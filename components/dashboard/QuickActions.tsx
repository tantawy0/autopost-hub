import Link from "next/link";
import { Calendar, FileText, Layers3, Plus } from "lucide-react";

const ACTIONS = [
  {
    href: "/create-post",
    label: "Create post",
    description: "Write once, schedule with destination checks.",
    icon: Plus,
    primary: true,
  },
  { href: "/calendar", label: "Open calendar", description: "See every queued post by time.", icon: Calendar },
  { href: "/drafts", label: "Review drafts", description: "Turn stored ideas into scheduled content.", icon: FileText },
  { href: "/channels", label: "Manage channels", description: "Reconnect or remove publishing destinations.", icon: Layers3 },
];

export default function QuickActions() {
  return (
    <section className="app-panel-soft rounded-lg p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Quick Actions</h2>
          <p className="mt-1 text-sm text-zinc-400">The four moves that keep the content loop moving.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex min-h-[112px] flex-col justify-between rounded-lg p-4 text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                action.primary
                  ? "bg-emerald-300 text-zinc-950 hover:bg-emerald-200"
                  : "border border-white/10 bg-zinc-950/45 text-zinc-100 hover:border-white/18 hover:bg-white/8"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-black">{action.label}</span>
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    action.primary ? "bg-zinc-950/10" : "bg-white/8"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
              </span>
              <span className={action.primary ? "mt-4 text-xs font-semibold text-zinc-800" : "mt-4 text-xs leading-5 text-zinc-400"}>
                {action.description}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
