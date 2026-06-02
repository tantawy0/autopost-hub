"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

const POLL_INTERVAL_MS = 30_000;
const LOCK_KEY = "autopost:due-post-processor-lock";
const LAST_RUN_KEY = "autopost:due-post-processor-last-run";
const LOCK_TTL_MS = 25_000;

type SchedulerResult = {
  processed?: number;
  published?: number;
  partiallyPublished?: number;
  failed?: number;
};

function acquireLock() {
  const now = Date.now();
  const lock = Number(window.localStorage.getItem(LOCK_KEY) ?? 0);
  const lastRun = Number(window.localStorage.getItem(LAST_RUN_KEY) ?? 0);

  if ((lock && now - lock < LOCK_TTL_MS) || (lastRun && now - lastRun < POLL_INTERVAL_MS)) {
    return false;
  }

  window.localStorage.setItem(LOCK_KEY, String(now));
  window.localStorage.setItem(LAST_RUN_KEY, String(now));
  return true;
}

function releaseLock() {
  window.localStorage.removeItem(LOCK_KEY);
}

export default function DuePostProcessor() {
  const router = useRouter();
  const running = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled || running.current || document.visibilityState === "hidden") return;
      if (!acquireLock()) return;

      running.current = true;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) return;

        const response = await fetch("/api/scheduler/process-my-due-posts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ limit: 10 }),
        });

        if (!response.ok) return;

        const result = (await response.json()) as SchedulerResult;

        if (result.published || result.partiallyPublished || result.failed) {
          window.dispatchEvent(new CustomEvent("autopost:due-posts-processed"));
          router.refresh();
          toast.success(
            `Auto-published due posts: ${result.published ?? 0} published, ${result.failed ?? 0} failed.`,
          );
        }
      } finally {
        running.current = false;
        releaseLock();
      }
    };

    void run();

    const interval = window.setInterval(() => void run(), POLL_INTERVAL_MS);
    const onFocus = () => void run();

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [router]);

  return null;
}
