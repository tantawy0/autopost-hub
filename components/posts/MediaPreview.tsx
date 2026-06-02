"use client";

import Image from "next/image";
import { Film } from "lucide-react";

import type { MediaAssetDTO } from "@/lib/types";

interface MediaPreviewProps {
  media: MediaAssetDTO;
  className?: string;
  imageClassName?: string;
  controls?: boolean;
  priority?: boolean;
}

function isVideoMedia(media: MediaAssetDTO) {
  return media.mediaType === "video" || /\.(mp4|mov|m4v|webm)(\?.*)?$/i.test(media.url);
}

export default function MediaPreview({
  media,
  className = "",
  imageClassName = "h-full w-full object-cover",
  controls = false,
  priority = false,
}: MediaPreviewProps) {
  if (isVideoMedia(media)) {
    return (
      <div className={`relative overflow-hidden bg-black ${className}`}>
        <video
          src={media.url}
          className={imageClassName}
          controls={controls}
          muted
          playsInline
          preload="metadata"
        />
        {!controls ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[10px] font-black text-white backdrop-blur">
            <Film size={12} aria-hidden="true" />
            Video
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <Image
        src={media.url}
        alt=""
        fill
        unoptimized
        priority={priority}
        sizes="(max-width: 768px) 100vw, 320px"
        className={imageClassName}
      />
    </div>
  );
}
