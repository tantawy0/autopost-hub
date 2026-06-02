import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-secondary/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r",
        "before:from-transparent before:via-white/5 before:to-transparent",
        className,
      )}
    />
  );
}

export const SkeletonLine = ({ className }: { className?: string }) => (
  <Shimmer className={cn("h-3 w-full rounded", className)} />
);

export const SkeletonKpiGrid = ({ count = 4 }: { count?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="glass rounded-2xl p-5 space-y-3">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-8 w-28" />
        <SkeletonLine className="h-2 w-16" />
      </div>
    ))}
  </div>
);

export const SkeletonChart = ({ className }: { className?: string }) => (
  <div className={cn("glass rounded-2xl p-5", className)}>
    <SkeletonLine className="h-4 w-40 mb-4" />
    <Shimmer className="h-64 w-full rounded-xl" />
  </div>
);

export const SkeletonPostCard = () => (
  <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Shimmer className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-3 w-3/4" />
        <SkeletonLine className="h-2 w-1/3" />
      </div>
    </div>
    <SkeletonLine className="h-2 w-full" />
    <SkeletonLine className="h-2 w-5/6" />
  </div>
);

export const SkeletonTableRows = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 p-3">
        <Shimmer className="h-12 w-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-3 w-2/3" />
          <SkeletonLine className="h-2 w-1/3" />
        </div>
        <Shimmer className="h-6 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

export const SkeletonChannelGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Shimmer className="h-8 w-8 rounded-lg" />
          <Shimmer className="h-2 w-2 rounded-full" />
        </div>
        <SkeletonLine className="h-3 w-2/3" />
        <SkeletonLine className="h-2 w-1/2" />
      </div>
    ))}
  </div>
);

export const SkeletonMediaGrid = ({ count = 12 }: { count?: number }) => (
  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
    {Array.from({ length: count }).map((_, i) => (
      <Shimmer key={i} className="aspect-square rounded-xl" />
    ))}
  </div>
);

export const SkeletonMessage = ({ align = "left" }: { align?: "left" | "right" }) => (
  <div className={cn("flex gap-3", align === "right" && "flex-row-reverse")}>
    <Shimmer className="h-8 w-8 rounded-lg shrink-0" />
    <div className="flex-1 max-w-[80%] space-y-2">
      <SkeletonLine className="h-3 w-1/2" />
      <SkeletonLine className="h-3 w-full" />
      <SkeletonLine className="h-3 w-2/3" />
    </div>
  </div>
);
