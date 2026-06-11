export const PLATFORMS = ["Facebook", "Instagram", "TikTok", "LinkedIn"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const POST_STATUSES = [
  "Draft",
  "Scheduled",
  "Published",
  "Partially Published",
  "Failed",
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const CONNECTED_ACCOUNT_STATUSES = [
  "Connected",
  "Disconnected",
  "Expired",
  "Revoked",
  "Unauthorized",
  "Placeholder",
] as const;
export type ConnectedAccountStatus = (typeof CONNECTED_ACCOUNT_STATUSES)[number];

export const PUBLISHING_ATTEMPT_STATUSES = [
  "Pending",
  "Publishing",
  "Succeeded",
  "Failed",
  "Skipped",
] as const;
export type PublishingAttemptStatus = (typeof PUBLISHING_ATTEMPT_STATUSES)[number];

export type MediaType = "image" | "video" | "carousel" | "unknown";

export interface MediaAssetDTO {
  id?: string;
  url: string;
  mediaType: MediaType;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storageBucket?: string | null;
  storagePath?: string | null;
}

export interface ConnectedAccountDTO {
  id: string;
  platform: Platform;
  accountName: string;
  accountId?: string | null;
  pageId?: string | null;
  instagramBusinessAccountId?: string | null;
  providerMetadata?: Record<string, unknown> | null;
  status: ConnectedAccountStatus;
  reconnectRequired: boolean;
  publishCapable: boolean;
}

export interface PublishingAttemptDTO {
  id?: string;
  destinationAccountId?: string | null;
  platform: Platform;
  destinationAccountName: string;
  status: PublishingAttemptStatus;
  message: string;
  providerPostId?: string | null;
  finishedAt?: string | null;
}

export interface PostCardDTO {
  id: string;
  caption: string;
  firstComment: string;
  media: MediaAssetDTO[];
  imageUrl: string | null;
  platforms: Platform[];
  status: PostStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  failureSummary: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  attempts: PublishingAttemptDTO[];
  internalNotes?: string;
  postFormat?: "Post" | "Reel" | "Story";
  approvalRequested?: boolean;
  approvalStatus?: "None" | "Requested" | "Approved" | "Changes Requested";
}

export interface DashboardSummaryDTO {
  counts: {
    totalPosts: number;
    draftPosts: number;
    scheduledPosts: number;
    publishedPosts: number;
    partiallyPublishedPosts: number;
    failedPosts: number;
    connectedChannels: number;
  };
  draftQueue: PostCardDTO[];
  scheduledQueue: PostCardDTO[];
  recentPublished: PostCardDTO[];
  connectedChannels: ConnectedAccountDTO[];
}

export interface SocialPostDTO {
  id: string;
  connectedAccountId: string;
  platform: Platform;
  accountName: string;
  externalPostId: string;
  caption: string;
  mediaType: string | null;
  mediaUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  likeCount: number | null;
  commentsCount: number | null;
  reactionsCount: number | null;
  engagementRate: number | null;
  viewsCount: number | null;
  sharesCount: number | null;
  savesCount: number | null;
  followsCount: number | null;
  reachCount: number | null;
}

export interface SavePostInput {
  postId?: string;
  caption: string;
  firstComment: string;
  imageUrl: string | null;
  platforms: Platform[];
  destinationAccountIds?: string[];
  status: "Draft" | "Scheduled";
  scheduledFor: string | null;
  mediaAssets?: MediaAssetDTO[];
  internalNotes?: string;
  postFormat?: "Post" | "Reel" | "Story";
  approvalRequested?: boolean;
}

export function normalizePlatform(value: string | null | undefined): Platform {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "facebook") return "Facebook";
  if (normalized === "instagram") return "Instagram";
  if (normalized === "tiktok") return "TikTok";
  if (normalized === "linkedin" || normalized === "linked in") return "LinkedIn";

  return "Facebook";
}

export function normalizePostStatus(value: string | null | undefined): PostStatus {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "draft") return "Draft";
  if (normalized === "scheduled") return "Scheduled";
  if (normalized === "published") return "Published";
  if (normalized === "partially published" || normalized === "partially_published") {
    return "Partially Published";
  }
  if (normalized === "failed") return "Failed";

  return "Draft";
}

export function normalizeConnectedAccountStatus(
  value: string | null | undefined,
): ConnectedAccountStatus {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "connected") return "Connected";
  if (normalized === "disconnected") return "Disconnected";
  if (normalized === "expired") return "Expired";
  if (normalized === "revoked") return "Revoked";
  if (normalized === "unauthorized") return "Unauthorized";
  if (normalized === "placeholder") return "Placeholder";

  return "Disconnected";
}

export function isTerminalPostStatus(status: PostStatus): boolean {
  return status === "Published" || status === "Partially Published" || status === "Failed";
}
