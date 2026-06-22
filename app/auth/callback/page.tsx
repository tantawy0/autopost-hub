"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

import { Logo } from "@/components/copied-ui/Logo";
import { Button } from "@/components/ui/button";
import { normalizeAuthNext } from "@/lib/auth-redirect";
import { normalizeLocale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";

const callbackCopy = {
  en: {
    genericError: "Authentication could not be completed.",
    missingCode: "The authentication provider did not return a login code.",
    attention: "Sign-in needs attention",
    back: "Back to sign in",
    opening: "Opening your workspace",
    finishing: "Finishing secure sign-in...",
  },
  ar: {
    genericError: "تعذر إكمال تسجيل الدخول.",
    missingCode: "مزود تسجيل الدخول لم يرجع كود الدخول.",
    attention: "تسجيل الدخول يحتاج متابعة",
    back: "الرجوع لتسجيل الدخول",
    opening: "جاري فتح مساحة العمل",
    finishing: "بننهي تسجيل الدخول الآمن...",
  },
} as const;

function cleanProviderMessage(value: string | null, fallback: string) {
  if (!value) return fallback;

  return value.replace(/\+/g, " ").slice(0, 220);
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const locale = useUiStore((state) => state.locale);
  const setLocale = useUiStore((state) => state.setLocale);
  const text = callbackCopy[locale];
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocale(normalizeLocale(window.localStorage.getItem("autopost:locale")));
  }, [setLocale]);

  useEffect(() => {
    let active = true;

    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const next = normalizeAuthNext(params.get("next"));
      const providerError = params.get("error_description") ?? params.get("error");
      const code = params.get("code");

      if (providerError) {
        if (active) setError(cleanProviderMessage(providerError, text.genericError));
        return;
      }

      if (!code) {
        if (active) setError(text.missingCode);
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        if (active) setError(exchangeError.message);
        return;
      }

      router.replace(next);
      router.refresh();
    };

    void finish();

    return () => {
      active = false;
    };
  }, [router, text.genericError, text.missingCode]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo href="/" />
        </div>
        <div className="glass-strong rounded-2xl p-6 text-center">
          {error ? (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold">{text.attention}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
              <Button asChild className="mt-5 w-full bg-gradient-primary text-primary-foreground shadow-glow">
                <Link href="/auth">{text.back}</Link>
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold">{text.opening}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{text.finishing}</p>
              <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-primary" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
