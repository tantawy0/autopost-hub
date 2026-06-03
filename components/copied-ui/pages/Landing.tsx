"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight, Sparkles, CalendarDays, Send, BarChart3, Users, Plug, Check, Star,
  Camera as Instagram, MessageCircle as Facebook, BriefcaseBusiness as Linkedin, Music2, Tv as Youtube, AtSign as Twitter, Image as ImageIcon, Hash, Zap, ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/copied-ui/Logo";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/copied-ui/PlatformBadge";
import { Typewriter, TypewriterCycle } from "@/components/copied-ui/effects/Typewriter";
import { ShiningText } from "@/components/copied-ui/effects/ShiningText";
import { TextScramble } from "@/components/copied-ui/effects/TextScramble";
import { HandWritingText } from "@/components/copied-ui/effects/HandWritingText";
import { PixelLogoGrid } from "@/components/copied-ui/effects/PixelLogoGrid";
import { NeonButton } from "@/components/copied-ui/effects/NeonButton";
import { AnimatedThemeToggler } from "@/components/copied-ui/effects/AnimatedThemeToggler";

const Landing = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [0.92, 1.04]);
  const heroY = useTransform(scrollYProgress, [0, 1], [40, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0.85]);
  const heroBlur = useTransform(scrollYProgress, [0, 1], [0, 6]);
  const heroFilter = useTransform(heroBlur, (b) => `blur(${b}px)`);

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Logo href="/" />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#integrations" className="hover:text-foreground transition">Integrations</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <AnimatedThemeToggler />
            <Link href="/auth" className="hidden md:inline-flex text-sm text-muted-foreground hover:text-foreground transition px-3">Sign in</Link>
            <Button asChild className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Link href="/auth">Start free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO - scroll-expansion */}
      <section ref={heroRef} className="relative min-h-[140vh]">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 ring-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="container relative pt-20 pb-12 lg:pt-28 sticky top-16">

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-primary"><Sparkles className="h-2.5 w-2.5 text-primary-foreground" /></span>
              <TextScramble text="AI-POWERED PUBLISHING" trigger="mount" className="text-[10px]" />
            </div>

            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              <Typewriter words={[
                { text: "Create." }, { text: "Schedule." }, { text: "Publish." },
                { text: "with", className: "text-muted-foreground/70" },
              ]} />
              <div className="mt-2">
                <ShiningText className="text-4xl md:text-6xl lg:text-7xl font-display font-bold">one beautiful hub.</ShiningText>
              </div>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-muted-foreground inline-flex flex-wrap justify-center gap-1">
              <span>Schedule posts for</span>
              <TypewriterCycle phrases={["Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube Shorts", "X / Twitter"]} className="text-foreground font-medium" />
              <span>- all from one calm, AI-first workspace.</span>
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <NeonButton onClick={() => (window.location.href = "/auth")}>
                <Sparkles className="h-4 w-4" /> Start scheduling
              </NeonButton>
              <Button asChild size="lg" variant="outline" className="border-border bg-secondary/40 hover:bg-secondary">
                <Link href="/dashboard">View live demo</Link>
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-success" /> 14-day trial · no credit card · cancel anytime
            </div>
          </motion.div>

          {/* Scroll-expansion hero visual - scrubs with scrollYProgress */}
          <motion.div
            style={{ scale: heroScale, y: heroY, opacity: heroOpacity, filter: heroFilter }}
            className="relative mx-auto mt-16 max-w-6xl will-change-transform"
          >

            <div className="absolute -inset-12 bg-gradient-primary opacity-10 blur-3xl rounded-[3rem]" />
            <div className="relative glass-strong rounded-3xl p-3 md:p-4">
              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-7 rounded-2xl border border-border bg-card/60 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-display text-lg font-semibold">November 2026</div>
                    <div className="flex gap-1 rounded-lg bg-secondary p-0.5 text-xs">
                      {["Month","Week","List"].map((t,i) => (
                        <button key={t} className={`px-3 py-1 rounded-md ${i===0 ? "bg-background text-foreground" : "text-muted-foreground"}`}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-[10px]">
                    {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} className="text-center text-muted-foreground">{d}</div>)}
                    {Array.from({length: 28}).map((_,i) => {
                      const hasPost = [3,5,8,9,12,15,17,19,22,25].includes(i);
                      return (
                        <div key={i} className="aspect-square rounded-lg border border-border bg-background/40 p-1.5 flex flex-col">
                          <span className="text-muted-foreground">{i+1}</span>
                          {hasPost && <div className="mt-auto h-1.5 rounded-full bg-gradient-primary" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="md:col-span-5 space-y-3">
                  <div className="rounded-2xl border border-border bg-card/60 p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-accent" /> AI Composer</div>
                    <div className="mt-2 text-sm">Three hairstyle trends our stylists are loving this season ✨</div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <PlatformBadge platform="instagram" /><PlatformBadge platform="tiktok" /><PlatformBadge platform="facebook" />
                      <span className="ml-auto text-[11px] text-muted-foreground">Sat · 9:00 AM</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-card/60 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reach</div>
                      <div className="font-display text-xl font-bold">184k</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-secondary"><div className="h-full w-3/4 rounded-full bg-gradient-primary" /></div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card/60 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Engagement</div>
                      <div className="font-display text-xl font-bold">7.4%</div>
                      <div className="mt-1 h-1 w-full rounded-full bg-secondary"><div className="h-full w-1/2 rounded-full bg-accent" /></div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-gradient-card p-4">
                    <div className="text-[10px] uppercase tracking-wider text-accent font-semibold">AI insight</div>
                    <div className="mt-1 text-sm">Your reels perform best at <span className="font-semibold">8 PM</span> on Thursdays.</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Metrics */}
      <section className="border-y border-border/60 bg-secondary/20 py-10">
        <div className="container grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {[
            { k: "12,400+", v: "Creators & agencies" },
            { k: "4.2M", v: "Posts scheduled" },
            { k: "98%", v: "Publishing success" },
            { k: "4.9★", v: "Average rating" },
          ].map((s) => (
            <div key={s.v}>
              <div className="font-display text-3xl font-bold">{s.k}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* STACK FEATURE SECTION */}
      <section id="features" className="container py-24">
        <div className="mx-auto max-w-2xl text-center">
          <TextScramble text="EVERYTHING YOU NEED" className="text-xs text-primary font-semibold" />
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            A single workspace for <ShiningText>modern publishing</ShiningText>
          </h2>
          <p className="mt-4 text-muted-foreground">Six tools, perfectly stacked. No more juggling tabs, sheets and DMs.</p>
        </div>

        <div className="mt-14 space-y-4 max-w-5xl mx-auto">
          {[
            { icon: Send, title: "Unified Publishing", desc: "Compose once, publish everywhere with platform-aware previews and validation.", color: "from-primary/30 to-primary/5" },
            { icon: Sparkles, title: "AI Caption Generator", desc: "On-brand captions, hashtag sets and rewrites - generated in your tone of voice.", color: "from-accent/30 to-accent/5" },
            { icon: CalendarDays, title: "Smart Calendar", desc: "Drag-and-drop scheduling, queues, optimal-time slots and team approvals.", color: "from-primary/25 to-accent/5" },
            { icon: BarChart3, title: "Real Analytics", desc: "Cross-channel reach, engagement and conversion in one dashboard.", color: "from-accent/25 to-primary/5" },
            { icon: Plug, title: "Multi-platform Channels", desc: "Instagram, Facebook, LinkedIn, TikTok, YouTube Shorts, X, Pinterest and Threads.", color: "from-primary/30 to-accent/10" },
            { icon: Users, title: "Team Workflow", desc: "Roles, approvals, comments and threads - built for agencies and brands.", color: "from-accent/30 to-primary/10" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.05, duration: 0.45 }}
              className="group relative glass gradient-border rounded-2xl p-6 md:p-7 hover-lift overflow-hidden"
            >
              <div className={`absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-to-br ${f.color} blur-3xl opacity-60 group-hover:opacity-100 transition`} />
              <div className="relative flex items-start gap-5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-primary/15 text-primary border border-primary/20">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="font-display text-xl font-semibold">{f.title}</div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">0{i+1}</span>
                  </div>
                  <p className="mt-1.5 text-sm md:text-base text-muted-foreground max-w-2xl">{f.desc}</p>
                </div>
                <ArrowRight className="hidden md:block h-5 w-5 text-muted-foreground transition group-hover:text-primary group-hover:translate-x-1" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* INTEGRATIONS SECTION */}
      <section id="integrations" className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl glass-strong p-8 md:p-12">
          <div className="absolute inset-0 bg-gradient-hero opacity-40" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <TextScramble text="CONTENT AUTOMATION" className="text-xs text-accent font-semibold" />
              <h3 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight">Every channel. One workflow.</h3>
              <p className="mt-3 text-muted-foreground max-w-md">Secure OAuth, automatic token refresh, granular permissions and real-time connection health monitoring across every platform you publish to.</p>
              <div className="mt-6 grid grid-cols-2 gap-2 text-sm max-w-md">
                {[
                  { icon: ShieldCheck, t: "Secure OAuth 2.0" },
                  { icon: Zap, t: "Auto token refresh" },
                  { icon: Check, t: "Health monitoring" },
                  { icon: Plug, t: "1-click reconnect" },
                ].map(({ icon: Ic, t }) => (
                  <div key={t} className="flex items-center gap-2 text-muted-foreground"><Ic className="h-4 w-4 text-primary" /> {t}</div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { Icon: Instagram, name: "Instagram", color: "from-pink-500/20 to-orange-400/20" },
                { Icon: Facebook, name: "Facebook", color: "from-blue-600/20 to-blue-400/20" },
                { Icon: Linkedin, name: "LinkedIn", color: "from-sky-600/20 to-cyan-500/20" },
                { Icon: Music2, name: "TikTok", color: "from-zinc-700/20 to-rose-500/20" },
                { Icon: Youtube, name: "YT Shorts", color: "from-red-600/20 to-red-400/20" },
                { Icon: Twitter, name: "X", color: "from-zinc-700/20 to-zinc-500/20" },
                { Icon: ImageIcon, name: "Pinterest", color: "from-rose-600/20 to-rose-400/20" },
                { Icon: Hash, name: "Threads", color: "from-zinc-800/20 to-zinc-600/20" },
              ].map((p, i) => (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  whileHover={{ y: -4 }}
                  className="aspect-square rounded-2xl border border-border bg-card/60 p-3 flex flex-col items-center justify-center gap-2 hover:border-primary/40 transition"
                >
                  <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${p.color}`}>
                    <p.Icon className="h-4 w-4" />
                  </div>
                  <div className="text-[10px] font-medium text-muted-foreground">{p.name}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PIXEL LOGO GRID - supported platforms / ecosystem */}
      <section className="container pb-24">
        <div className="text-center mb-10">
          <TextScramble text="LOVED BY THE CREATOR ECOSYSTEM" className="text-xs text-muted-foreground font-semibold" />
          <h3 className="mt-3 font-display text-2xl md:text-3xl font-semibold">Built to plug into everything you already use.</h3>
        </div>
        <div className="max-w-4xl mx-auto opacity-80 [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_90%)]">
          <PixelLogoGrid cols={10} rows={4} />
        </div>
      </section>

      {/* HANDWRITING */}
      <section className="container pb-24">
        <div className="mx-auto max-w-2xl text-center text-primary/80">
          <HandWritingText text="Plan once. Publish everywhere." className="text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Built for creators who post every day.</p>
        </div>
      </section>

      {/* PRICING SECTION 4 */}
      <section id="pricing" className="container pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <TextScramble text="SIMPLE PRICING" className="text-xs text-primary font-semibold" />
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">Scales with you, never against you.</h2>
          <p className="mt-3 text-muted-foreground">14-day free trial on every plan. No credit card. Cancel anytime.</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4 max-w-7xl mx-auto">
          {[
              { name: "Free", price: 0, desc: "For testing your first real workspace.", feats: ["1 channel", "25 scheduled posts/mo", "Heuristic AI", "Basic analytics"], cta: "Start free" },
              { name: "Creator", price: 12, desc: "For solo creators getting consistent.", feats: ["3 channels", "100 scheduled posts/mo", "AI captions", "30-day analytics"], cta: "Upgrade Creator" },
              { name: "Pro", price: 29, desc: "Best for serious creators & brands.", feats: ["10 channels", "Unlimited posts", "Advanced analytics", "AI assistant Pro", "Team of 3"], cta: "Try Pro", featured: true },
              { name: "Agency", price: 79, desc: "For teams managing many clients.", feats: ["Unlimited channels", "Approvals & roles", "Client workflows", "Team of 15"], cta: "Try Agency" },
          ].map((p) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className={`relative rounded-2xl p-6 flex flex-col ${p.featured ? "glass-strong gradient-border bg-gradient-to-b from-primary/10 to-transparent" : "glass"}`}
            >
              {p.featured && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow">Most popular</div>}
              <div className="font-display text-lg font-semibold">{p.name}</div>
              <p className="mt-1 text-xs text-muted-foreground min-h-[2.5rem]">{p.desc}</p>
              <div className="mt-4 flex items-baseline gap-1">
                {p.price !== null ? (
                  <><span className="font-display text-4xl font-bold">${p.price}</span><span className="text-sm text-muted-foreground">/mo</span></>
                ) : (
                  <span className="font-display text-2xl font-bold">Custom</span>
                )}
              </div>
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {p.feats.map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success shrink-0" /> <span className="text-muted-foreground">{f}</span></li>
                ))}
              </ul>
              <Button asChild className={`mt-6 w-full ${p.featured ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary hover:bg-secondary/80"}`}>
                <Link href="/auth">{p.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container pb-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-center">Frequently asked</h2>
          <div className="mt-8 space-y-3">
            {[
              { q: "Which platforms are supported?", a: "Instagram, Facebook, LinkedIn, TikTok, YouTube Shorts, X, Pinterest and Threads - with more rolling out monthly." },
              { q: "Do you support team approvals?", a: "Yes. Pro, Agency and Enterprise plans include roles, comments, approvals and full audit history." },
              { q: "Can I migrate from Buffer, Later or Publer?", a: "Yes. Our import wizard moves your scheduled posts and drafts in a few clicks." },
              { q: "Is there a free trial?", a: "Every plan includes a 14-day free trial. No credit card required." },
            ].map((f) => (
              <details key={f.q} className="group glass rounded-2xl p-5 open:bg-secondary/30">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">{f.q}<span className="text-muted-foreground transition group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/20 via-background to-accent/20 p-10 text-center md:p-16">
          <div className="absolute inset-0 ring-grid opacity-20" />
          <h3 className="relative font-display text-3xl md:text-5xl font-bold">Ship every post with confidence.</h3>
          <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">Start your free trial - connect your first channel in under a minute.</p>
          <div className="relative mt-7 flex justify-center">
            <NeonButton onClick={() => (window.location.href = "/auth")}>
              Start free <ArrowRight className="h-4 w-4" />
            </NeonButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-secondary/20">
        <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <Logo href="/" />
          <div className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-warning" /> 4.9 · 1,200+ reviews</div>
          <div>© {new Date().getFullYear()} Auto Post Hub. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


