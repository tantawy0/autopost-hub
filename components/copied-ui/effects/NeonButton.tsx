import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export const NeonButton = forwardRef<HTMLButtonElement, Props>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    {...props}
    className={cn(
      "group relative inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold",
      "bg-gradient-to-br from-primary to-accent text-primary-foreground",
      "shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_8px_30px_-8px_hsl(var(--primary)/0.55)]",
      "transition-all duration-300 hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.6),0_10px_40px_-6px_hsl(var(--primary)/0.7)]",
      "hover:-translate-y-0.5 active:translate-y-0",
      className,
    )}
  >
    <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/15 to-transparent opacity-0 transition group-hover:opacity-100" />
    <span className="relative inline-flex items-center gap-2">{children}</span>
  </button>
));
NeonButton.displayName = "NeonButton";
