import type { ConnectedAccountDTO, Platform } from "@/lib/types";
import { toUiPlatform, type UiPlatform } from "@/lib/ui-repo-adapters";

export const COMPOSER_PLATFORM_ORDER: UiPlatform[] = [
  "instagram",
  "facebook",
  "linkedin",
  "tiktok",
];

const PLATFORM_ORDER: Platform[] = ["Instagram", "Facebook", "LinkedIn", "TikTok"];

export function getUniqueDestinationPlatforms(
  destinations: ConnectedAccountDTO[],
): Platform[] {
  const selected = new Set(destinations.map((destination) => destination.platform));

  return PLATFORM_ORDER.filter((platform) => selected.has(platform));
}

export function getComposerPreviewPlatforms(
  selectedDestinations: ConnectedAccountDTO[],
): UiPlatform[] {
  const selected = new Set(
    selectedDestinations.map((destination) => toUiPlatform(destination.platform)),
  );

  return COMPOSER_PLATFORM_ORDER.filter((platform) => selected.has(platform));
}

export function getActivePreviewPlatform(
  current: UiPlatform,
  previewPlatforms: UiPlatform[],
): UiPlatform | null {
  if (previewPlatforms.includes(current)) return current;

  return previewPlatforms[0] ?? null;
}
