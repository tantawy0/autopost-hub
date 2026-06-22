"use client";

import { useEffect, useState } from "react";
import { Bell, Check, CreditCard, Key, Loader2, Plug, User, Users } from "lucide-react";
import { toast } from "sonner";

import { PLAN_DEFINITIONS, type PlanDefinition, type PlanKey } from "@/lib/billing/plans";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/lib/ui-store";
import { formatAppNumber, getPageCopy } from "@/lib/page-copy";

const sections = [
  { id: "profile", icon: User },
  { id: "team", icon: Users },
  { id: "billing", icon: CreditCard },
  { id: "integrations", icon: Plug },
  { id: "api", icon: Key },
  { id: "notif", icon: Bell },
];

type BillingStatus = {
  plan: PlanDefinition;
  usage: {
    channels: number;
    scheduledPostsMonthly: number;
    aiRequestsMonthly: number;
    mediaStorageMb: number;
    teamMembers: number;
  } | null;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
    seats: number;
  };
  stripe: {
    configured: boolean;
    portalAvailable: boolean;
    checkoutPlans: Array<{ key: PlanKey; configured: boolean }>;
  };
};

function planName(plan: PlanDefinition, locale: "en" | "ar") {
  if (locale !== "ar") return plan.name;
  return {
    free: "مجانية",
    creator: "صانع محتوى",
    pro: "احترافية",
    agency: "وكالات",
    enterprise: "مؤسسات",
  }[plan.key];
}

function planBilling(plan: PlanDefinition, locale: "en" | "ar") {
  if (locale !== "ar") return plan.billingLabel;
  if (plan.key === "free") return "دائمًا";
  if (plan.key === "enterprise") return "تواصل مع المبيعات";
  return "شهريًا";
}

function planPrice(plan: PlanDefinition, locale: "en" | "ar") {
  if (locale !== "ar") return plan.priceLabel;
  return plan.priceLabel === "Custom" ? "مخصص" : plan.priceLabel;
}

function planFeature(feature: string, locale: "en" | "ar") {
  if (locale !== "ar") return feature;

  const map: Record<string, string> = {
    "1 channel": "قناة واحدة",
    "25 scheduled posts/month": "25 بوست مجدول شهريًا",
    "Heuristic AI assistant": "مساعد ذكي محلي بدون تكلفة",
    "Basic analytics": "تحليلات أساسية",
    "3 channels": "3 قنوات",
    "100 scheduled posts/month": "100 بوست مجدول شهريًا",
    "AI captions": "كابشنات بالذكاء",
    "30-day analytics": "تحليلات 30 يوم",
    "10 channels": "10 قنوات",
    "Unlimited scheduled posts": "بوستات مجدولة غير محدودة",
    "Pro AI assistant": "مساعد ذكاء احترافي",
    "Team of 3": "فريق من 3 أعضاء",
    "Unlimited channels": "قنوات غير محدودة",
    "Approvals and roles": "موافقات وصلاحيات",
    "Client-ready workflows": "مسارات جاهزة للعملاء",
    "Priority support": "دعم أولوية",
    "Custom limits": "حدود مخصصة",
    "SLA and DPA": "اتفاقيات SLA و DPA",
    "Dedicated onboarding": "تهيئة مخصصة",
    "Custom integrations": "تكاملات مخصصة",
  };

  return map[feature] ?? feature;
}

function formatLimitLocalized(value: number | null, locale: "en" | "ar", suffix = "") {
  if (value === null) return locale === "ar" ? "غير محدود" : "Unlimited";
  return `${formatAppNumber(value, locale)}${suffix}`;
}

export default function Settings() {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).settings;
  const [tab, setTab] = useState("profile");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="glass h-fit rounded-2xl p-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setTab(section.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${tab === section.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`}
            >
              <section.icon className="h-4 w-4" />
              {t.sections[section.id as keyof typeof t.sections]}
            </button>
          ))}
        </aside>
        <div className="glass space-y-6 rounded-2xl p-6">
          {tab === "profile" ? (
            <>
              <Field label={t.workspaceName} value="Creator OS" />
              <Field label={t.timezone} value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
              <Field label={t.brandVoice} value={t.brandVoiceValue} textarea />
              <Button onClick={() => toast.success(t.saved)} className="bg-gradient-primary text-primary-foreground shadow-glow">{t.saveChanges}</Button>
            </>
          ) : null}
          {tab === "team" ? (
            <Empty title={t.teamTitle} text={t.teamText} />
          ) : null}
          {tab === "billing" ? <BillingPanel /> : null}
          {tab === "integrations" ? (
            <Empty title={t.integrationsTitle} text={t.integrationsText} />
          ) : null}
          {tab === "api" ? (
            <Empty title={t.apiTitle} text={t.apiText} />
          ) : null}
          {tab === "notif" ? (
            <div className="space-y-3">
              {t.notifications.map((name) => (
                <label key={name} className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-secondary/30 p-3">
                  <span className="text-sm">{name}</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BillingPanel() {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).settings;
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/status", {
        headers: await getClientAuthHeaders(),
      });
      const body = (await response.json().catch(() => null)) as BillingStatus & { message?: string };
      if (!response.ok) throw new Error(body?.message ?? t.billingLoadError);
      setStatus(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.billingLoadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void load());
  }, []);

  const checkout = async (planKey: PlanKey) => {
    setBusy(planKey);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: await getClientAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ planKey }),
      });
      const body = (await response.json().catch(() => null)) as { url?: string; message?: string; code?: string } | null;
      if (!response.ok || !body?.url) throw new Error(body?.message ?? t.checkoutUnavailable);
      window.location.assign(body.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.checkoutUnavailable);
    } finally {
      setBusy(null);
    }
  };

  const portal = async () => {
    setBusy("portal");
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: await getClientAuthHeaders(),
      });
      const body = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
      if (!response.ok || !body?.url) throw new Error(body?.message ?? t.portalUnavailable);
      window.location.assign(body.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.portalUnavailable);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t.billingLoad}
      </div>
    );
  }

  const current = status?.plan ?? PLAN_DEFINITIONS.free;
  const usage = status?.usage ?? null;
  const configuredPlans = new Map(status?.stripe.checkoutPlans.map((plan) => [plan.key, plan.configured]) ?? []);

  return (
    <div className="space-y-5">
      <div>
        <div className="font-display text-lg font-semibold">{t.billingTitle}</div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.currentPlan(planName(current, locale))}
        </p>
      </div>

      {!status?.stripe.configured ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {t.stripeMissing}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(PLAN_DEFINITIONS).filter((plan) => plan.publicSignup).map((plan) => {
          const active = plan.key === current.key;
          const paidConfigured = plan.key === "free" || configuredPlans.get(plan.key);

          return (
            <div key={plan.key} className={`rounded-2xl border p-4 ${active ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/30"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-base font-semibold">{planName(plan, locale)}</div>
                {active ? <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">{t.active}</span> : null}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold">{planPrice(plan, locale)}</span>
                <span className="text-xs text-muted-foreground">{planBilling(plan, locale)}</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success" />
                    {planFeature(feature, locale)}
                  </li>
                ))}
              </ul>
              {plan.key === "free" ? (
                <Button disabled className="mt-4 w-full bg-secondary text-muted-foreground">{t.included}</Button>
              ) : (
                <Button
                  disabled={active || busy === plan.key || !paidConfigured}
                  onClick={() => void checkout(plan.key)}
                  className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-60"
                >
                  {busy === plan.key ? t.opening : paidConfigured ? t.upgrade : t.priceMissing}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4 text-sm md:grid-cols-3">
        <Limit label={t.limits.channels} value={formatLimitLocalized(current.limits.channels, locale)} used={usage?.channels} />
        <Limit label={t.limits.scheduled} value={formatLimitLocalized(current.limits.scheduledPostsMonthly, locale, locale === "ar" ? " / شهر" : "/mo")} used={usage?.scheduledPostsMonthly} />
        <Limit label={t.limits.ai} value={formatLimitLocalized(current.limits.aiRequestsMonthly, locale, locale === "ar" ? " / شهر" : "/mo")} used={usage?.aiRequestsMonthly} />
        <Limit label={t.limits.media} value={formatLimitLocalized(current.limits.mediaStorageMb, locale, " MB")} used={usage ? Math.round(usage.mediaStorageMb) : undefined} />
        <Limit label={t.limits.team} value={formatLimitLocalized(current.limits.teamMembers, locale)} used={usage?.teamMembers} />
        <Limit label={t.limits.analytics} value={formatLimitLocalized(current.limits.analyticsDays, locale, locale === "ar" ? " يوم" : " days")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!status?.stripe.portalAvailable || busy === "portal"} onClick={() => void portal()} variant="outline">
          {busy === "portal" ? t.openingPortal : t.manageBilling}
        </Button>
        <Button onClick={() => void load()} variant="outline">{t.refresh}</Button>
      </div>
    </div>
  );
}

function Limit({ label, value, used }: { label: string; value: string; used?: number }) {
  const locale = useUiStore((state) => state.locale);
  const t = getPageCopy(locale).settings;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
      {typeof used === "number" ? <div className="mt-0.5 text-[11px] text-muted-foreground">{t.used(formatAppNumber(used, locale))}</div> : null}
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="font-display text-lg font-semibold">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Field({ label, value, textarea }: { label: string; value: string; textarea?: boolean }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea defaultValue={value} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
      ) : (
        <input defaultValue={value} className="mt-1.5 w-full rounded-xl border border-border bg-secondary/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
      )}
    </div>
  );
}
