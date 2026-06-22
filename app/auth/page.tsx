"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CalendarDays, Code2 as Github, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/copied-ui/Logo";
import { PlatformBadge } from "@/components/copied-ui/PlatformBadge";
import { ShiningText } from "@/components/copied-ui/effects/ShiningText";
import { Button } from "@/components/ui/button";
import { buildAuthCallbackUrl, normalizeAuthNext } from "@/lib/auth-redirect";
import { normalizeLocale } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";

const authCopy = {
  en: {
    back: "Back to site",
    welcome: "Welcome back",
    createAccount: "Create account",
    signinPrefix: "Sign in to your",
    createPrefix: "Create your",
    workspace: "workspace.",
    connecting: "Connecting...",
    google: "Continue with Google",
    github: "Continue with GitHub",
    divider: "or with email",
    email: "Email address",
    password: "Password",
    keepSignedIn: "Keep me signed in",
    sending: "Sending...",
    forgot: "Forgot password?",
    wait: "Please wait...",
    continue: "Continue to workspace",
    newUser: "New to Auto Post Hub?",
    existingUser: "Already have an account?",
    signIn: "Sign in",
    enterCredentials: "Enter email and password",
    created: "Account created. Confirm your email, then sign in.",
    signedIn: "Signed in",
    authFailed: "Authentication failed",
    socialFailed: "Social sign-in failed",
    enterEmail: "Enter your email first",
    resetSent: "Password reset email sent",
    resetFailed: "Unable to send reset email",
    badge: "AI-first publishing",
    hero: <>Plan, publish & understand <span className="gradient-text">every post</span> from one calm workspace.</>,
    queue: "Today's queue",
    stats: { reach: "Reach", ai: "AI posts", scheduled: "Scheduled" },
    footer: "Terms · Privacy",
  },
  ar: {
    back: "الرجوع للموقع",
    welcome: "أهلًا برجوعك",
    createAccount: "إنشاء حساب",
    signinPrefix: "سجّل دخولك إلى",
    createPrefix: "أنشئ",
    workspace: "مساحة العمل.",
    connecting: "جاري الربط...",
    google: "المتابعة بجوجل",
    github: "المتابعة بجيت هب",
    divider: "أو بالبريد الإلكتروني",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    keepSignedIn: "خليك مسجل دخول",
    sending: "جاري الإرسال...",
    forgot: "نسيت كلمة المرور؟",
    wait: "استنى لحظة...",
    continue: "الدخول لمساحة العمل",
    newUser: "لسه جديد على Auto Post Hub؟",
    existingUser: "عندك حساب بالفعل؟",
    signIn: "تسجيل الدخول",
    enterCredentials: "اكتب البريد الإلكتروني وكلمة المرور",
    created: "تم إنشاء الحساب. أكد بريدك الإلكتروني ثم سجّل الدخول.",
    signedIn: "تم تسجيل الدخول",
    authFailed: "فشل تسجيل الدخول",
    socialFailed: "فشل تسجيل الدخول الاجتماعي",
    enterEmail: "اكتب بريدك الإلكتروني الأول",
    resetSent: "تم إرسال رسالة إعادة تعيين كلمة المرور",
    resetFailed: "تعذر إرسال رسالة إعادة التعيين",
    badge: "نشر مدعوم بالذكاء",
    hero: <>خطط، انشر، وافهم <span className="gradient-text">كل بوست</span> من مساحة عمل واحدة هادئة.</>,
    queue: "طابور اليوم",
    stats: { reach: "الوصول", ai: "بوستات AI", scheduled: "مجدول" },
    footer: "الشروط · الخصوصية",
  },
} as const;

export default function AuthPage() {
  const router = useRouter();
  const locale = useUiStore((state) => state.locale);
  const setLocale = useUiStore((state) => state.setLocale);
  const text = authCopy[locale];
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "github" | null>(null);

  useEffect(() => {
    setLocale(normalizeLocale(window.localStorage.getItem("autopost:locale")));
  }, [setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => setHydrated(true));

    const finishAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get("error_description") ?? params.get("error");
      const code = params.get("code");
      const next = normalizeAuthNext(params.get("next"));

      if (errorDescription) {
        toast.error(errorDescription);
        window.history.replaceState(null, "", "/auth");
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error(error.message);
          window.history.replaceState(null, "", "/auth");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (active && data.session) {
        router.replace(next);
        router.refresh();
      }
    };

    void finishAuth();

    return () => {
      active = false;
    };
  }, [router]);

  const submit = async () => {
    if (!email || !password) {
      toast.error(text.enterCredentials);
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const next = normalizeAuthNext(new URLSearchParams(window.location.search).get("next"));
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: buildAuthCallbackUrl(window.location.origin, next) },
        });
        if (error) throw error;
        toast.success(text.created);
        setMode("login");
        setPassword("");
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        const next = normalizeAuthNext(new URLSearchParams(window.location.search).get("next"));
        toast.success(text.signedIn);
        router.replace(next);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.authFailed);
    } finally {
      setLoading(false);
    }
  };

  const signInWithProvider = async (provider: "google" | "github") => {
    setSocialLoading(provider);
    try {
      const next = normalizeAuthNext(new URLSearchParams(window.location.search).get("next"));
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: buildAuthCallbackUrl(window.location.origin, next),
          queryParams:
            provider === "google"
              ? { access_type: "offline", prompt: "consent" }
              : undefined,
        },
      });

      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.socialFailed);
      setSocialLoading(null);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      toast.error(text.enterEmail);
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildAuthCallbackUrl(window.location.origin, "/settings"),
      });
      if (error) throw error;
      toast.success(text.resetSent);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.resetFailed);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <div className="relative flex flex-col px-6 py-8 lg:px-14">
        <div className="flex items-center justify-between">
          <Logo href="/" />
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition">&larr; {text.back}</Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight">{mode === "login" ? text.welcome : text.createAccount}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{mode === "login" ? text.signinPrefix : text.createPrefix} <ShiningText>Auto Post Hub</ShiningText> {text.workspace}</p>
          </div>

          <div className="flex flex-col gap-3">
            <button type="button" disabled={!hydrated || Boolean(socialLoading)} onClick={() => void signInWithProvider("google")} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium hover:bg-secondary transition disabled:cursor-not-allowed disabled:opacity-60">
              <GoogleIcon /> {socialLoading === "google" ? text.connecting : text.google}
            </button>
            <button type="button" disabled={!hydrated || Boolean(socialLoading)} onClick={() => void signInWithProvider("github")} className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium hover:bg-secondary transition disabled:cursor-not-allowed disabled:opacity-60">
              <Github className="h-4 w-4" /> {socialLoading === "github" ? text.connecting : text.github}
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground"><div className="h-px flex-1 bg-border" /> {text.divider} <div className="h-px flex-1 bg-border" /></div>
          <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="flex flex-col gap-3">
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input aria-label={text.email} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@brand.com" className="h-11 w-full rounded-xl border border-border bg-secondary/40 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" /></div>
            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><input aria-label={text.password} type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="**********" className="h-11 w-full rounded-xl border border-border bg-secondary/40 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" /></div>
            <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-muted-foreground cursor-pointer"><input type="checkbox" className="accent-primary" /> {text.keepSignedIn}</label><button type="button" disabled={!hydrated || resetLoading} onClick={() => void resetPassword()} className="text-primary hover:underline disabled:opacity-60">{resetLoading ? text.sending : text.forgot}</button></div>
            <Button type="submit" disabled={!hydrated || loading} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95">{loading ? text.wait : mode === "login" ? text.continue : text.createAccount} <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">{mode === "login" ? text.newUser : text.existingUser} <button type="button" onClick={() => setMode((value) => value === "login" ? "register" : "login")} className="text-primary hover:underline">{mode === "login" ? text.createAccount : text.signIn}</button></p>
        </motion.div>
        <p className="mt-auto text-center text-[10px] text-muted-foreground">© {new Date().getFullYear()} Auto Post Hub · {text.footer}</p>
      </div>

      <div className="relative hidden lg:flex items-center justify-center overflow-hidden border-l border-border bg-gradient-to-br from-card via-background to-background">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" /><div className="absolute inset-0 ring-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative w-[min(520px,90%)] flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><Sparkles className="h-3 w-3 text-accent" /> {text.badge}</div>
          <h2 className="font-display text-4xl font-bold leading-tight">{text.hero}</h2>
          <div className="glass-strong rounded-2xl p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 text-primary" /> {text.queue}</div><div className="mt-3 flex flex-col gap-2">{[
            { t: "14:30", c: "New summer collection drops Friday", p: ["instagram","facebook"] as const },
            { t: "17:00", c: "How we cut churn 38% in one quarter...", p: ["linkedin"] as const },
            { t: "19:30", c: "Behind the scenes of our tasting menu.", p: ["instagram","tiktok"] as const },
          ].map((post, index) => <motion.div key={post.t} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.1 }} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-2.5"><div className="grid h-9 w-12 place-items-center rounded-lg bg-primary/15 text-[11px] font-bold text-primary">{post.t}</div><div className="flex-1 min-w-0 text-xs truncate">{post.c}</div><div className="flex -space-x-1">{post.p.map((platform) => <PlatformBadge key={platform} platform={platform} size="xs" />)}</div></motion.div>)}</div></div>
          <div className="grid grid-cols-3 gap-3"><Stat icon={BarChart3} label={text.stats.reach} value="184k" /><Stat icon={Sparkles} label={text.stats.ai} value="42" /><Stat icon={CalendarDays} label={text.stats.scheduled} value="68" /></div>
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


