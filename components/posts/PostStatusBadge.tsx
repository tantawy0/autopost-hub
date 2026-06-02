import StatusPill from "@/components/ui/StatusPill";
import type { PostStatus } from "@/lib/types";

interface PostStatusBadgeProps {
  status: PostStatus;
}

export default function PostStatusBadge({ status }: PostStatusBadgeProps) {
  return <StatusPill status={status} />;
}
