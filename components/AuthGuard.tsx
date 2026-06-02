"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        if (error) toast.error(error.message);
        if (!session) toast.message("Sign in to continue");
        router.push("/auth");
        return;
      }

      setLoading(false);
    };

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="app-background flex min-h-screen items-center justify-center px-4 text-white">
        <div className="app-panel w-full max-w-sm rounded-2xl p-7 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.055] shadow-[0_0_48px_rgb(189_229_173_/_0.12)]">
            <span className="silent-loader" aria-hidden="true" />
          </div>
          <p className="text-xl font-black">Checking session...</p>
          <p className="mt-2 text-sm text-zinc-400">Preparing your publishing workspace.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
