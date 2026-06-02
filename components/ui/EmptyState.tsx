import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="glass-card premium-cta-card relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-10 text-center">
      <div className="premium-grid-mask pointer-events-none absolute inset-0 opacity-45" aria-hidden="true" />
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#bde5ad]/12 text-[#d8ffd0] shadow-[0_0_42px_rgb(189_229_173_/_0.12)]">
        <Icon size={24} aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
