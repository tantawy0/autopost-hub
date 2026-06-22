"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, HelpCircle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDictionary, getGuideStepIndex, getGuideSteps, isRtlLocale } from "@/lib/i18n";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

const storageKey = "autopost:onboarding-guide-dismissed:v1";

export function FloatingGuide() {
  const pathname = usePathname();
  const locale = useUiStore((state) => state.locale);
  const dictionary = getDictionary(locale);
  const isRtl = isRtlLocale(locale);
  const steps = useMemo(() => getGuideSteps(locale), [locale]);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const routeStepIndex = useMemo(() => {
    const matchedIndex = steps.findIndex((step) => pathname === step.href || pathname.startsWith(`${step.href}/`));
    return matchedIndex >= 0 ? matchedIndex : 0;
  }, [pathname, steps]);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    });
  }, []);

  if (!mounted) return null;

  const currentIndex = getGuideStepIndex(stepIndex ?? routeStepIndex, steps.length);
  const current = steps[currentIndex];
  const atEnd = currentIndex === steps.length - 1;
  const PreviousIcon = isRtl ? ArrowRight : ArrowLeft;
  const NextIcon = isRtl ? ArrowLeft : ArrowRight;

  const dismiss = () => {
    window.localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => {
          window.localStorage.removeItem(storageKey);
          setDismissed(false);
        }}
        className={cn(
          "fixed bottom-24 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-2 text-xs font-semibold text-foreground shadow-elevated backdrop-blur-xl transition hover:bg-secondary",
          isRtl ? "left-4 lg:left-6" : "right-4 lg:right-6",
        )}
        aria-label={dictionary.guide.reopen}
      >
        <HelpCircle className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">{dictionary.guide.reopen}</span>
      </button>
    );
  }

  return (
    <aside
      role="complementary"
      aria-label={dictionary.guide.label}
      className={cn(
        "fixed bottom-24 z-40 w-[min(calc(100vw-2rem),24rem)] rounded-2xl border border-border bg-background/90 p-4 shadow-elevated backdrop-blur-2xl lg:bottom-24",
        isRtl ? "left-4 text-right lg:left-6" : "right-4 text-left lg:right-6",
      )}
    >
      <div className={cn("flex items-start justify-between gap-3", isRtl && "flex-row-reverse")}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{dictionary.guide.eyebrow}</p>
          <p className="mt-1 text-base font-bold text-foreground">{current.title}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={dictionary.guide.close}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-secondary/50 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.body}</p>

      <div className="mt-4" aria-live="polite">
        <div className={cn("mb-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground", isRtl && "flex-row-reverse")}>
          <span>
            {dictionary.guide.progress} {currentIndex + 1}/{steps.length}
          </span>
          <span>{current.href}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className={cn("mt-4 flex flex-wrap items-center gap-2", isRtl && "flex-row-reverse")}>
        <Link
          href={current.href}
          className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-gradient-primary px-3 text-xs font-bold text-primary-foreground shadow-glow transition hover:opacity-95"
        >
          {dictionary.guide.openStep}
        </Link>
        <button
          type="button"
          onClick={() => setStepIndex((index) => getGuideStepIndex((index ?? currentIndex) - 1, steps.length))}
          disabled={currentIndex === 0}
          className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-secondary/50 px-3 text-xs font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
        >
          <PreviousIcon className="h-3.5 w-3.5" />
          {dictionary.guide.previous}
        </button>
        <button
          type="button"
          onClick={() => {
            if (atEnd) dismiss();
            else setStepIndex((index) => getGuideStepIndex((index ?? currentIndex) + 1, steps.length));
          }}
          className="inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-secondary/50 px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
        >
          {atEnd ? dictionary.guide.finish : dictionary.guide.next}
          {!atEnd ? <NextIcon className="h-3.5 w-3.5" /> : null}
        </button>
      </div>
    </aside>
  );
}
