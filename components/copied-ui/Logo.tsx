import { Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, withText = true, href = "/dashboard" }: { className?: string; withText?: boolean; href?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-gradient-primary blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
        <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Sparkles className="h-4.5 w-4.5" strokeWidth={2.5} />
        </div>
      </div>
      {withText ? (
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold tracking-tight">Auto Post Hub</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Schedule · Publish · Grow</div>
        </div>
      ) : null}
    </Link>
  );
}
