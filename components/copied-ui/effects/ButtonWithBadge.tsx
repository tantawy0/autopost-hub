import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  badge?: ReactNode;
  badgeVariant?: "default" | "ai" | "success" | "warning" | "destructive";
  variant?: "default" | "outline" | "ghost" | "primary";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

const badgeStyles: Record<string, string> = {
  default: "bg-secondary text-foreground border border-border",
  ai: "bg-gradient-to-r from-primary to-accent text-primary-foreground",
  success: "bg-success/15 text-success border border-success/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  destructive: "bg-destructive/15 text-destructive border border-destructive/30",
};

const variants: Record<string, string> = {
  default: "bg-secondary text-foreground hover:bg-secondary/80 border border-border",
  outline: "bg-transparent text-foreground hover:bg-secondary/60 border border-border",
  ghost: "bg-transparent text-foreground hover:bg-secondary/60",
  primary: "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95",
};

const sizes: Record<string, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const ButtonWithBadge = forwardRef<HTMLButtonElement, Props>(
  ({ badge, badgeVariant = "default", variant = "default", size = "md", asChild = false, className, children, ...rest }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
          variants[variant], sizes[size], className,
        )}
        {...rest}
      >
        <Slottable>{children}</Slottable>
        {badge !== undefined && badge !== null && (
          <span className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tracking-wide", badgeStyles[badgeVariant])}>
            {badge}
          </span>
        )}
      </Comp>
    );
  },
);
ButtonWithBadge.displayName = "ButtonWithBadge";
