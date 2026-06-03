import type { ConnectedAccountDTO, Platform, PostCardDTO, SocialPostDTO } from "@/lib/types";

export type UiPlatform = "instagram" | "facebook" | "linkedin" | "tiktok";
export type UiPostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

export const uiPlatformMeta: Record<UiPlatform, { name: string; color: string; initial: string }> = {
  instagram: { name: "Instagram", color: "from-pink-500 to-orange-400", initial: "IG" },
  facebook: { name: "Facebook", color: "from-blue-600 to-blue-400", initial: "FB" },
  linkedin: { name: "LinkedIn", color: "from-sky-600 to-cyan-500", initial: "IN" },
  tiktok: { name: "TikTok", color: "from-zinc-900 to-rose-500", initial: "TT" },
};

export interface UiPost {
  id: string;
  caption: string;
  platforms: UiPlatform[];
  status: UiPostStatus;
  scheduledAt: string;
  author: { name: string; avatar: string };
  media?: string | null;
  stats?: { reach: number; engagement: number; clicks: number };
  source: PostCardDTO;
}

export interface UiChannel {
  id: string;
  platform: UiPlatform;
  handle: string;
  status: "healthy" | "warning" | "error" | "disconnected";
  followers: number;
  lastSync: string;
  tokenHealth: number;
  permissions: { name: string; granted: boolean }[];
  missingPermission?: string;
  source?: ConnectedAccountDTO;
}

export function toUiPlatform(platform: Platform): UiPlatform {
  return platform.toLowerCase() as UiPlatform;
}

export function toUiPost(post: PostCardDTO): UiPost {
  return {
    id: post.id,
    caption: post.caption,
    platforms: post.platforms.map(toUiPlatform),
    status: post.status === "Scheduled" ? "scheduled" : post.status === "Published" ? "published" : post.status === "Failed" || post.status === "Partially Published" ? "failed" : "draft",
    scheduledAt: post.scheduledFor ?? post.publishedAt ?? post.updatedAt ?? post.createdAt ?? new Date().toISOString(),
    author: { name: "Creator OS", avatar: "OS" },
    media: post.media[0]?.url ?? post.imageUrl,
    source: post,
  };
}

export function toUiImportedPost(post: SocialPostDTO): UiPost {
  return {
    id: post.id,
    caption: post.caption,
    platforms: [toUiPlatform(post.platform)],
    status: "published",
    scheduledAt: post.timestamp ?? "",
    author: { name: post.accountName, avatar: post.accountName.slice(0, 2).toUpperCase() },
    media: post.mediaUrl,
    stats: {
      reach: post.reachCount ?? 0,
      engagement: post.engagementRate ?? 0,
      clicks: post.commentsCount ?? 0,
    },
    source: post as unknown as PostCardDTO,
  };
}

export function toUiChannel(account: ConnectedAccountDTO): UiChannel {
  const status = account.reconnectRequired ? "error" : account.status === "Connected" ? "healthy" : "warning";
  return {
    id: account.id,
    platform: toUiPlatform(account.platform),
    handle: account.accountName,
    status,
    followers: 0,
    lastSync: "Live",
    tokenHealth: status === "healthy" ? 100 : 0,
    permissions: [
      { name: "Publish posts", granted: account.publishCapable },
      { name: "Read analytics", granted: account.status === "Connected" },
    ],
    missingPermission: account.publishCapable ? undefined : "Reconnect required",
    source: account,
  };
}
