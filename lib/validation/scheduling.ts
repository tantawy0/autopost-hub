import type { ConnectedAccountDTO, PostStatus } from "@/lib/types";

export function validateScheduleTime(value: string | null): string | null {
  if (!value) {
    return "Select a future schedule time.";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Select a valid schedule time.";
  }

  if (date.getTime() <= Date.now()) {
    return "Schedule time must be in the future.";
  }

  return null;
}

export function validatePostContent(caption: string, imageUrl: string | null): string | null {
  if (!caption.trim() && !imageUrl) {
    return "Add a caption or media before saving.";
  }

  return null;
}

export function validateSelectableDestinations(destinations: ConnectedAccountDTO[]): string | null {
  if (destinations.length === 0) {
    return "Select at least one connected publishing destination.";
  }

  const unavailable = destinations.find(
    (destination) => destination.reconnectRequired || !destination.publishCapable,
  );

  if (unavailable) {
    return `${unavailable.accountName} must be reconnected before scheduling or publishing.`;
  }

  return null;
}

export function validateStatusTransition(from: PostStatus, to: PostStatus): string | null {
  if (from === "Published" && to !== "Published") {
    return "Published posts are terminal and cannot be moved back to the queue.";
  }

  if (from === "Partially Published" && to !== "Partially Published") {
    return "Partially published posts are terminal for attempted destinations.";
  }

  return null;
}
