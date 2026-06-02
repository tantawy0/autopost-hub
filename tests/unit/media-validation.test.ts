import assert from "node:assert/strict";
import test from "node:test";

import {
  MEDIA_BUCKET,
  buildMediaStoragePath,
  getSafeMediaExtension,
  platformSupportsMedia,
  validateMediaFile,
  validateDestinationMedia,
  validateStoredMediaAsset,
} from "@/lib/validation/media";

test.describe("media validation and storage paths", () => {
  test("accepts supported media and rejects empty, oversized, or unsupported files", () => {
    assert.equal(validateMediaFile(new File(["image"], "post.jpg", { type: "image/jpeg" })), null);
    assert.equal(validateMediaFile(new File(["video"], "clip.webm", { type: "video/webm" })), null);

    assert.match(
      validateMediaFile(new File([], "empty.jpg", { type: "image/jpeg" })) ?? "",
      /empty/i,
    );
    assert.match(
      validateMediaFile(new File(["text"], "notes.txt", { type: "text/plain" })) ?? "",
      /image or video/i,
    );

    const hugeFile = { type: "video/mp4", size: 201 * 1024 * 1024 } as File;
    assert.match(validateMediaFile(hugeFile) ?? "", /200 MB/i);
  });

  test("derives safe extensions from MIME type and scopes paths by user/workspace", () => {
    assert.equal(getSafeMediaExtension({ name: "clip.exe", type: "video/mp4" }), "mp4");

    const path = buildMediaStoragePath({
      userId: "user-1",
      workspaceId: "workspace-1",
      file: { name: "unsafe.exe", type: "image/png" },
      now: 1,
      id: "asset-1",
    });

    assert.equal(path, "user-1/workspace-1/1-asset-1.png");
  });

  test("rejects stored media outside the expected bucket, user scope, or public URL strategy", () => {
    const valid = {
      url: "https://cdn.example.test/object.png",
      mediaType: "image" as const,
      mimeType: "image/png",
      sizeBytes: 1024,
      storageBucket: MEDIA_BUCKET,
      storagePath: "user-1/workspace-1/object.png",
    };

    assert.equal(validateStoredMediaAsset(valid, { userId: "user-1", workspaceId: "workspace-1" }), null);
    assert.match(
      validateStoredMediaAsset({ ...valid, storageBucket: "other" }, { userId: "user-1" }) ?? "",
      /unsupported bucket/i,
    );
    assert.match(
      validateStoredMediaAsset({ ...valid, storagePath: "user-2/workspace-1/object.png" }, { userId: "user-1" }) ?? "",
      /publishing user/i,
    );
    assert.match(
      validateStoredMediaAsset({ ...valid, url: "http://cdn.example.test/object.png" }, { userId: "user-1" }) ?? "",
      /secure public URL/i,
    );
  });

  test("keeps LinkedIn text-only until media asset upload is implemented", () => {
    assert.equal(platformSupportsMedia("LinkedIn", "unknown"), true);
    assert.equal(platformSupportsMedia("LinkedIn", "image"), false);

    const errors = validateDestinationMedia(
      [{ url: "https://cdn.example.test/object.png", mediaType: "image" }],
      [
        {
          id: "account-1",
          platform: "LinkedIn",
          accountName: "Creator Profile",
          status: "Connected",
          reconnectRequired: false,
          publishCapable: true,
        },
      ],
    );

    assert.match(errors[0], /does not support image media/i);
  });
});
