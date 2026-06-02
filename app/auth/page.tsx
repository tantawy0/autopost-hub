"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CalendarDays, Code2 as Github, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/copied-ui/Logo";
import { PlatformBadge } from "@/components/copied-ui/PlatformBadge";
import { ShiningText } from "@/components/copied-ui/effects/ShiningText";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      toast.error("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
        if (error) throw error;
        toast.success("Account created. Confirm your email, then sign in.");
        setMode("login");
        setPassword("");
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        toast.success("Signed in");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <div className="relative flex flex-col px-6 py-8 lg:px-14">
        <div className="flex items-center justify-between">
          <Logo href="/" />
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition">&larr; Back to site</Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create account"}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{mode === "login" ? "Sign in to your" : "Create your"} <ShiningText>Auto Post Hub</ShiningText> workspace.</p>
          </div>

          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => toast.message("Google login is not enabled yet")} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium hover:bg-secondary transition">
              <GoogleIcon /> Continue with Google
            </button>
            <button type="button" onClick={() => toast.message("GitHub login is not enabled yet")} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium hover:bg-secondary transition">
              <Github className="h-4 w-4" /> Continue with GitHub
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground"><div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" /></div>
          <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="flex flex-col gap-3">
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input aria-label="Email address" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@brand.com" className="h-11 w-full rounded-xl border border-border bg-secondary/40 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" /></div>
            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input aria-label="Password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="**********" className="h-11 w-full rounded-xl border border-border bg-secondary/40 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" /></div>
            <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-muted-foreground cursor-pointer"><input type="checkbox" className="accent-primary" /> Keep me signed in</label><a href="#" className="text-primary hover:underline">Forgot password?</a></div>
            <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">{loading ? "Please wait..." : mode === "login" ? "Continue to workspace" : "Create account"} <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">{mode === "login" ? "New to Auto Post Hub?" : "Already have an account?"} <button type="button" onClick={() => setMode((value) => value === "login" ? "register" : "login")} className="text-primary hover:underline">{mode === "login" ? "Create an account" : "Sign in"}</button></p>
        </motion.div>
        <p className="mt-auto text-center text-[10px] text-muted-foreground">© {new Date().getFullYear()} Auto Post Hub · Terms · Privacy</p>
      </div>

      <div className="relative hidden lg:flex items-center justify-center overflow-hidden border-l border-border bg-gradient-to-br from-card via-background to-background">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" /><div className="absolute inset-0 ring-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative w-[min(520px,90%)] flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><Sparkles className="h-3 w-3 text-accent" /> AI-first publishing</div>
          <h2 className="font-display text-4xl font-bold leading-tight">Plan, publish & understand <span className="gradient-text">every post</span> from one calm workspace.</h2>
          <div className="glass-strong rounded-2xl p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 text-primary" /> Today&apos;s queue</div><div className="mt-3 flex flex-col gap-2">{[
            { t: "14:30", c: "New summer collection drops Friday", p: ["instagram","facebook"] as const },
            { t: "17:00", c: "How we cut churn 38% in one quarter...", p: ["linkedin"] as const },
            { t: "19:30", c: "Behind the scenes of our tasting menu.", p: ["instagram","tiktok"] as const },
          ].map((post, index) => <motion.div key={post.t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.1 }} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-2.5"><div className="grid h-9 w-12 place-items-center rounded-lg bg-primary/15 text-[11px] font-bold text-primary">{post.t}</div><div className="flex-1 min-w-0 text-xs truncate">{post.c}</div><div className="flex -space-x-1">{post.p.map((platform) => <PlatformBadge key={platform} platform={platform} size="xs" />)}</div></motion.div>)}</div></div>
          <div className="grid grid-cols-3 gap-3"><Stat icon={BarChart3} label="Reach" value="184k" /><Stat icon={Sparkles} label="AI posts" value="42" /><Stat icon={CalendarDays} label="Scheduled" value="68" /></div>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-secondary/40 p-3"><Icon className="h-4 w-4 text-muted-foreground" /><div className="mt-1 font-display text-xl font-bold">{value}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div></div>;
}

function GoogleIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1S8.7 5.9 12 5.9c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" /></svg>;
}


