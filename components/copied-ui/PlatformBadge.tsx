import { cn } from "@/lib/utils";
import { type UiPlatform, uiPlatformMeta as platformMeta } from "@/lib/ui-repo-adapters";

export function PlatformBadge({ platform, size = "sm", showName = false }: { platform: UiPlatform; size?: "xs" | "sm" | "md"; showName?: boolean }) {
  const meta = platformMeta[platform];
  const sizes = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-6 w-6 text-[10px]",
    md: "h-8 w-8 text-xs",
  };
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className={cn("grid place-items-center rounded-md bg-gradient-to-br font-bold text-white shadow-sm", meta.color, sizes[size])}>
        {meta.initial}
      </div>
      {showName && <span className="text-xs font-medium text-foreground/80">{meta.name}</span>}
    </div>
  );
}

export function PlatformStack({ platforms, max = 4 }: { platforms: UiPlatform[]; max?: number }) {
  const visible = platforms.slice(0, max);
  const extra = platforms.length - visible.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((p) => (
        <div key={p} className="ring-2 ring-background rounded-md">
          <PlatformBadge platform={p} size="sm" />
        </div>
      ))}
      {extra > 0 && (
        <div className="grid h-6 w-6 place-items-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
          +{extra}
        </div>
      )}
    </div>
  );
}
