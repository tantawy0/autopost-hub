"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import AuthGuard from "@/components/AuthGuard";
import { CopiedAppShell } from "@/components/copied-ui/shell/AppShell";
import DuePostProcessor from "@/components/scheduler/DuePostProcessor";
import { supabase } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/auth");
  };

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("autopost:theme");
    if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("autopost:theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (!typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        router.push("/create");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <AuthGuard>
      <DuePostProcessor />
      <CopiedAppShell onLogout={handleLogout}>{children}</CopiedAppShell>
    </AuthGuard>
  );
}
