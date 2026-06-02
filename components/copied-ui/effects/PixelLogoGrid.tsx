import { motion } from "framer-motion";
import { AtSign, BriefcaseBusiness, Camera, Hash, MessageCircle, Music2, Send, Tv } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = [Camera, MessageCircle, BriefcaseBusiness, Music2, Tv, AtSign, Camera, MessageCircle, Hash, Tv, Send, AtSign];

export function PixelLogoGrid({ className, cols = 8, rows = 4 }: { className?: string; cols?: number; rows?: number }) {
  return (
    <div className={cn("grid w-full gap-2", className)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols * rows }).map((_, index) => {
        const Icon = ICONS[index % ICONS.length];
        const hasIcon = (index * 7 + 3) % 10 > 4;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: (index % cols) * 0.02 + Math.floor(index / cols) * 0.04, duration: 0.35 }}
            className="aspect-square rounded-lg border border-white/[0.05] bg-white/[0.02] grid place-items-center text-muted-foreground/40 hover:text-foreground/80 hover:border-white/15 transition"
          >
            {hasIcon ? <Icon className="h-4 w-4" /> : null}
          </motion.div>
        );
      })}
    </div>
  );
}
