"use client";

import { useEffect, useState } from "react";
import { Bell, Check, CreditCard, Key, Loader2, Plug, User, Users } from "lucide-react";
import { toast } from "sonner";

import { PLAN_DEFINITIONS, formatLimit, type PlanDefinition, type PlanKey } from "@/lib/billing/plans";
import { getClientAuthHeaders } from "@/lib/client-auth";
import { Button } from "@/components/ui/button";

const sections = [
  { id: "profile", label: "Workspace", icon: User },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "api", label: "API keys", icon: Key },
  { id: "notif", label: "Notifications", icon: Bell },
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

export default function Settings() {
  const [tab, setTab] = useState("profile");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace preferences, team and integrations.</p>
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
              {section.label}
            </button>
          ))}
        </aside>
        <div className="glass space-y-6 rounded-2xl p-6">
          {tab === "profile" ? (
            <>
              <Field label="Workspace name" value="Creator OS" />
              <Field label="Default timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
              <Field label="Brand voice" value="Configure your brand voice for AI-assisted drafts." textarea />
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow">Save changes</Button>
            </>
          ) : null}
          {tab === "team" ? (
            <Empty title="Team members" text="Team membership is managed by workspace RBAC. Invite controls will appear when workspace administration is enabled." />
          ) : null}
          {tab === "billing" ? <BillingPanel /> : null}
          {tab === "integrations" ? (
            <Empty title="Integrations" text="Social OAuth connections are managed from Channels. Webhook integrations are not enabled yet." />
          ) : null}
          {tab === "api" ? (
            <Empty title="API keys" text="Public API access is not enabled. Server credentials remain private." />
          ) : null}
          {tab === "notif" ? (
            <div className="space-y-3">
              {["Post published successfully", "Post failed to publish", "Weekly analytics digest", "Team mentions"].map((name) => (
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
      if (!response.ok) throw new Error(body?.message ?? "Unable to load billing");
      setStatus(body);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load billing");
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
      if (!response.ok || !body?.url) throw new Error(body?.message ?? "Checkout is not available yet");
      window.location.assign(body.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout is not available yet");
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
      if (!response.ok || !body?.url) throw new Error(body?.message ?? "Billing portal is not available yet");
      window.location.assign(body.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Billing portal is not available yet");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading billing...
      </div>
    );
  }

  const current = status?.plan ?? PLAN_DEFINITIONS.free;
  const usage = status?.usage ?? null;
  const configuredPlans = new Map(status?.stripe.checkoutPlans.map((plan) => [plan.key, plan.configured]) ?? []);

  return (
    <div className="space-y-5">
      <div>
        <div className="font-display text-lg font-semibold">Billing</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Current plan: <span className="font-semibold text-foreground">{current.name}</span>. Payments are handled by Stripe Checkout.
        </p>
      </div>

      {!status?.stripe.configured ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Stripe is not configured yet. Free plan stays active until Stripe keys and price IDs are added.
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(PLAN_DEFINITIONS).filter((plan) => plan.publicSignup).map((plan) => {
          const active = plan.key === current.key;
          const paidConfigured = plan.key === "free" || configuredPlans.get(plan.key);

          return (
            <div key={plan.key} className={`rounded-2xl border p-4 ${active ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/30"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-base font-semibold">{plan.name}</div>
                {active ? <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">Active</span> : null}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold">{plan.priceLabel}</span>
                <span className="text-xs text-muted-foreground">{plan.billingLabel}</span>
              </div>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.key === "free" ? (
                <Button disabled className="mt-4 w-full bg-secondary text-muted-foreground">Included</Button>
              ) : (
                <Button
                  disabled={active || busy === plan.key || !paidConfigured}
                  onClick={() => void checkout(plan.key)}
                  className="mt-4 w-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-60"
                >
                  {busy === plan.key ? "Opening..." : paidConfigured ? "Upgrade" : "Price missing"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4 text-sm md:grid-cols-3">
        <Limit label="Channels" value={formatLimit(current.limits.channels)} used={usage?.channels} />
        <Limit label="Scheduled posts" value={formatLimit(current.limits.scheduledPostsMonthly, "/mo")} used={usage?.scheduledPostsMonthly} />
        <Limit label="AI requests" value={formatLimit(current.limits.aiRequestsMonthly, "/mo")} used={usage?.aiRequestsMonthly} />
        <Limit label="Media storage" value={formatLimit(current.limits.mediaStorageMb, " MB")} used={usage ? Math.round(usage.mediaStorageMb) : undefined} />
        <Limit label="Team members" value={formatLimit(current.limits.teamMembers)} used={usage?.teamMembers} />
        <Limit label="Analytics history" value={formatLimit(current.limits.analyticsDays, " days")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!status?.stripe.portalAvailable || busy === "portal"} onClick={() => void portal()} variant="outline">
          {busy === "portal" ? "Opening portal..." : "Manage billing"}
        </Button>
        <Button onClick={() => void load()} variant="outline">Refresh</Button>
      </div>
    </div>
  );
}

function Limit({ label, value, used }: { label: string; value: string; used?: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
      {typeof used === "number" ? <div className="mt-0.5 text-[11px] text-muted-foreground">Used {used.toLocaleString()}</div> : null}
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
