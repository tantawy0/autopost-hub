"use client";

type OAuthPopupOptions = {
  name?: string;
  expectedPaths?: string[];
  onBlocked?: () => void;
  onClose?: () => void;
  onComplete?: (path: string) => void;
};

const DEFAULT_EXPECTED_PATHS = ["/channels", "/pages"];

function popupFeatures() {
  const width = Math.min(620, window.screen.availWidth);
  const height = Math.min(780, window.screen.availHeight);
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));

  return [
    "popup=yes",
    "resizable=yes",
    "scrollbars=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
  ].join(",");
}

function isExpectedReturnPath(pathname: string, expectedPaths: string[]) {
  return expectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function openOAuthPopup(url: string, options: OAuthPopupOptions = {}) {
  if (typeof window === "undefined") return false;

  const popup = window.open(url, options.name ?? "autopost-oauth", popupFeatures());

  if (!popup) {
    options.onBlocked?.();
    return false;
  }

  popup.focus();

  const expectedPaths = options.expectedPaths ?? DEFAULT_EXPECTED_PATHS;
  const interval = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(interval);
      options.onClose?.();
      return;
    }

    try {
      const next = new URL(popup.location.href);

      if (next.origin !== window.location.origin || !isExpectedReturnPath(next.pathname, expectedPaths)) {
        return;
      }

      window.clearInterval(interval);
      popup.close();
      options.onComplete?.(`${next.pathname}${next.search}${next.hash}`);
    } catch {
      // Cross-origin access is expected while the provider owns the popup.
    }
  }, 500);

  return true;
}
