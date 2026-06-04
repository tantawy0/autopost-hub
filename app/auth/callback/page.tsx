"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

import { Logo } from "@/components/copied-ui/Logo";
import { Button } from "@/components/ui/button";
import { normalizeAuthNext } from "@/lib/auth-redirect";
import { supabase } from "@/lib/supabase";

function cleanProviderMessage(value: string | null) {
  if (!value) return "Authentication could not be completed.";

  return value.replace(/\+/g, " ").slice(0, 220);
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const next = normalizeAuthNext(params.get("next"));
      const providerError = params.get("error_description") ?? params.get("error");
      const code = params.get("code");

      if (providerError) {
        if (active) setError(cleanProviderMessage(providerError));
        return;
      }

      if (!code) {
        if (active) setError("The authentication provider did not return a login code.");
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
  }, [router]);

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
              <h1 className="mt-4 font-display text-2xl font-bold">Sign-in needs attention</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
              <Button asChild className="mt-5 w-full bg-gradient-primary text-primary-foreground shadow-glow">
                <Link href="/auth">Back to sign in</Link>
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold">Opening your workspace</h1>
              <p className="mt-2 text-sm text-muted-foreground">Finishing secure sign-in...</p>
              <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-primary" />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
