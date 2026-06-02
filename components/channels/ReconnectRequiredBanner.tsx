import { AlertTriangle } from "lucide-react";

interface ReconnectRequiredBannerProps {
  count: number;
}

export default function ReconnectRequiredBanner({ count }: ReconnectRequiredBannerProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-amber-100">
      <AlertTriangle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
      <p className="text-sm leading-6">
        {count} connected destination{count === 1 ? "" : "s"} require reconnection before scheduling
        or publishing. Existing scheduled posts that reference them need user action.
      </p>
    </div>
  );
}
