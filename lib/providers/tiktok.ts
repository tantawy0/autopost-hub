import type { MediaType } from "@/lib/types";

export function isTikTokPublishEnabled(): boolean {
  return false;
}

export function validateTikTokPlaceholder(): string {
  return "TikTok publishing is not enabled yet.";
}

export function tiktokSupportsMedia(_mediaType: MediaType): boolean {
  void _mediaType;
  return false;
}
