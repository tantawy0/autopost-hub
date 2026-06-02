import type { ConnectedAccountDTO, MediaAssetDTO, MediaType, Platform } from "@/lib/types";

export const MEDIA_BUCKET = "post-images";
export const MAX_MEDIA_SIZE_BYTES = 200 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const PLATFORM_MEDIA_SUPPORT: Record<Platform, MediaType[]> = {
  Facebook: ["image", "video", "carousel", "unknown"],
  Instagram: ["image", "video", "carousel"],
  TikTok: [],
  LinkedIn: ["unknown"],
};

export function inferMediaType(file: Pick<File, "type"> | null | undefined): MediaType {
  if (!file?.type) return "unknown";
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) return "image";
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return "video";
  return "unknown";
}

export function validateMediaFile(file: File): string | null {
  const mediaType = inferMediaType(file);

  if (mediaType === "unknown") {
    return "Upload an image or video file supported by the selected destination.";
  }

  if (file.size <= 0) {
    return "Media file is empty.";
  }

  if (file.size > MAX_MEDIA_SIZE_BYTES) {
    return "Media must be smaller than 200 MB.";
  }

  return null;
}

export function getSafeMediaExtension(file: Pick<File, "type" | "name">): string {
  return MIME_EXTENSIONS[file.type] ?? file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "bin";
}

export function buildMediaStoragePath(input: {
  userId: string;
  workspaceId?: string | null;
  file: Pick<File, "type" | "name">;
  now?: number;
  id?: string;
}): string {
  const workspaceSegment = input.workspaceId?.replace(/[^a-zA-Z0-9-]/g, "") || "personal";
  const fileName = `${input.now ?? Date.now()}-${input.id ?? crypto.randomUUID()}.${getSafeMediaExtension(input.file)}`;

  return `${input.userId}/${workspaceSegment}/${fileName}`;
}

export function validateStoredMediaAsset(
  asset: MediaAssetDTO,
  expected: { userId: string; workspaceId?: string | null },
): string | null {
  if (asset.storageBucket && asset.storageBucket !== MEDIA_BUCKET) {
    return "Media asset is stored in an unsupported bucket.";
  }

  if (!asset.url || !/^https:\/\//i.test(asset.url)) {
    return "Media asset must use a secure public URL for publishing.";
  }

  if (asset.storagePath && !asset.storagePath.startsWith(`${expected.userId}/`)) {
    return "Media asset storage path is not scoped to the publishing user.";
  }

  if (
    expected.workspaceId &&
    asset.storagePath &&
    !asset.storagePath.startsWith(`${expected.userId}/${expected.workspaceId}/`) &&
    asset.storagePath.split("/").length > 2
  ) {
    return "Media asset storage path is not scoped to the publishing workspace.";
  }

  if (asset.mimeType && inferMediaType({ type: asset.mimeType }) === "unknown") {
    return "Media asset MIME type is not supported.";
  }

  if (typeof asset.sizeBytes === "number" && (asset.sizeBytes <= 0 || asset.sizeBytes > MAX_MEDIA_SIZE_BYTES)) {
    return "Media asset size is outside the supported range.";
  }

  return null;
}

export function validateDestinationMedia(
  media: MediaAssetDTO[],
  destinations: ConnectedAccountDTO[],
): string[] {
  const errors: string[] = [];

  for (const destination of destinations) {
    if (!destination.publishCapable) {
      errors.push(`${destination.platform} is not available for live publishing yet.`);
      continue;
    }

    for (const asset of media) {
      const supported = PLATFORM_MEDIA_SUPPORT[destination.platform].includes(asset.mediaType);

      if (!supported) {
        errors.push(
          `${destination.accountName} does not support ${asset.mediaType} media for this release.`,
        );
      }
    }
  }

  return errors;
}

export function platformSupportsMedia(platform: Platform, mediaType: MediaType): boolean {
  return PLATFORM_MEDIA_SUPPORT[platform].includes(mediaType);
}
