import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface DockItem { to: string; label: string; icon: React.ComponentType<{ className?: string }>; }

export function Dock({ items, className }: { items: DockItem[]; className?: string }) {
  const mouseX = useMotionValue(Infinity);
  const pathname = usePathname();
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex h-16 items-end gap-2 rounded-2xl border border-white/10 bg-background/70 px-3 pb-2 backdrop-blur-2xl shadow-elevated",
        className,
      )}
    >
      {items.map((item) => (
        <DockIcon key={item.to} mouseX={mouseX} item={item} active={pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to))} />
      ))}
    </motion.div>
  );
}

function DockIcon({ mouseX, item, active }: { mouseX: MotionValue<number>; item: DockItem; active: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });
  const sizeSync = useTransform(distance, [-120, 0, 120], [40, 64, 40]);
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 150, damping: 12 });
  const Icon = item.icon;
  return (
    <Link href={item.to} ref={ref} className="group relative">
      <motion.div
        style={{ width: size, height: size }}
        className={cn(
          "grid place-items-center rounded-xl border border-white/10 bg-secondary/60 transition-colors",
          active && "bg-gradient-primary border-primary/50",
        )}
      >
        <Icon className={cn("h-5 w-5", active ? "text-primary-foreground" : "text-foreground/80")} />
      </motion.div>
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[10px] font-medium opacity-0 transition group-hover:opacity-100">
        {item.label}
      </span>
    </Link>
  );
}
