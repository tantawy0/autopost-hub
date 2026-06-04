export const DEFAULT_AUTH_NEXT = "/dashboard";

export function normalizeAuthNext(value: string | null | undefined, fallback = DEFAULT_AUTH_NEXT) {
  if (!value) return fallback;

  try {
    const decoded = decodeURIComponent(value);

    if (!decoded.startsWith("/") || decoded.startsWith("//")) {
      return fallback;
    }

    const url = new URL(decoded, "https://autopost.local");

    if (url.origin !== "https://autopost.local") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}

export function buildAuthPath(next: string | null | undefined) {
  const normalized = normalizeAuthNext(next);

  return `/auth?next=${encodeURIComponent(normalized)}`;
}

export function buildAuthCallbackUrl(origin: string, next: string | null | undefined) {
  const normalized = normalizeAuthNext(next);
  const url = new URL("/auth/callback", origin);

  url.searchParams.set("next", normalized);

  return url.toString();
}
