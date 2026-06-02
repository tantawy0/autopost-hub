import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function EmptyState({
  icon, title, description, actionLabel, onAction, className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("glass flex flex-col items-center rounded-2xl px-8 py-12 text-center", className)}
    >
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary/15 text-primary">
        {icon}
      </div>
      <div className="font-display text-lg font-semibold">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && (
        <Button className="mt-5 bg-gradient-primary text-primary-foreground shadow-glow" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
