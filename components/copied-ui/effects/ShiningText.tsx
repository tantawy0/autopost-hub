import { cn } from "@/lib/utils";

export function ShiningText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("shining-text font-semibold", className)}>{children}</span>;
}
