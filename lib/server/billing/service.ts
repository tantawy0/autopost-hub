import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  getPlanDefinition,
  isPaidSelfServePlan,
  PLAN_DEFINITIONS,
  type PaidSelfServePlanKey,
  type PlanKey,
} from "@/lib/billing/plans";
import { getPlanUsage } from "@/lib/server/billing/limits";
import { getStripeClient, getStripeWebhookSecret, isStripeConfigured } from "@/lib/server/billing/stripe";
import { getAppUrl } from "@/lib/supabase-server";
import { ensureDefaultWorkspace, type WorkspaceContext } from "@/lib/workspaces";

type WorkspaceSubscriptionRow = {
  id: string;
  workspace_id: string;
  plan_key: PlanKey;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  seats: number;
};

type BillingCustomerRow = {
  stripe_customer_id: string;
};

export class BillingError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "BillingError";
    this.code = code;
    this.status = status;
  }
}

function toUnixDate(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function getPriceId(planKey: PaidSelfServePlanKey) {
  const envName = PLAN_DEFINITIONS[planKey].stripePriceEnv;
  const priceId = envName ? process.env[envName]?.trim() : "";

  if (!priceId) {
    throw new BillingError("stripe_price_missing", `Stripe price is not configured for ${planKey}.`, 503);
  }

  return priceId;
}

function getPlanFromPriceId(priceId: string | null | undefined): PlanKey {
  if (!priceId) return "free";

  for (const plan of Object.values(PLAN_DEFINITIONS)) {
    if (plan.stripePriceEnv && process.env[plan.stripePriceEnv]?.trim() === priceId) {
      return plan.key;
    }
  }

  return "free";
}

async function getSubscriptionRow(client: SupabaseClient, workspaceId: string) {
  const { data, error } = await client
    .from("workspace_subscriptions")
    .select(
      "id, workspace_id, plan_key, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end, cancel_at_period_end, trial_end, seats",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkspaceSubscriptionRow | null;
}

async function ensureFreeSubscription(client: SupabaseClient, workspace: WorkspaceContext) {
  if (!workspace.workspaceId) {
    throw new BillingError("workspace_required", "Workspace is required.", 400);
  }

  const existing = await getSubscriptionRow(client, workspace.workspaceId);
  if (existing) return existing;

  const { data, error } = await client
    .from("workspace_subscriptions")
    .insert([{ workspace_id: workspace.workspaceId, plan_key: "free", status: "free" }])
    .select(
      "id, workspace_id, plan_key, status, stripe_customer_id, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end, cancel_at_period_end, trial_end, seats",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkspaceSubscriptionRow;
}

async function getOrCreateStripeCustomer(
  client: SupabaseClient,
  user: User,
  workspace: WorkspaceContext,
) {
  if (!workspace.workspaceId) {
    throw new BillingError("workspace_required", "Workspace is required.", 400);
  }

  const { data: existing, error: customerError } = await client
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("workspace_id", workspace.workspaceId)
    .maybeSingle();

  if (customerError) {
    throw new Error(customerError.message);
  }

  if ((existing as BillingCustomerRow | null)?.stripe_customer_id) {
    return (existing as BillingCustomerRow).stripe_customer_id;
  }

  if (!isStripeConfigured()) {
    throw new BillingError("stripe_not_configured", "Stripe is not configured for this deployment.", 503);
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: {
      userId: user.id,
      workspaceId: workspace.workspaceId,
    },
  });

  const { error } = await client.from("billing_customers").upsert(
    [
      {
        user_id: user.id,
        workspace_id: workspace.workspaceId,
        stripe_customer_id: customer.id,
        email: user.email ?? null,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "workspace_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return customer.id;
}

export async function getBillingStatus(client: SupabaseClient, user: User) {
  const workspace = await ensureDefaultWorkspace(client, user);
  const subscription = await ensureFreeSubscription(client, workspace);
  const plan = getPlanDefinition(subscription.plan_key);
  const usage = workspace.workspaceId
    ? await getPlanUsage(client, workspace.workspaceId).catch(() => null)
    : null;

  return {
    workspace,
    plan,
    usage,
    subscription: {
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end,
      seats: subscription.seats,
    },
    stripe: {
      configured: isStripeConfigured(),
      portalAvailable: Boolean(subscription.stripe_customer_id && isStripeConfigured()),
      checkoutPlans: Object.values(PLAN_DEFINITIONS)
        .filter((candidate) => candidate.publicSignup && candidate.stripePriceEnv)
        .map((candidate) => ({
          key: candidate.key,
          configured: Boolean(process.env[candidate.stripePriceEnv!]?.trim()),
        })),
    },
  };
}

export async function createCheckoutSession(
  client: SupabaseClient,
  user: User,
  planKey: string,
) {
  if (!isPaidSelfServePlan(planKey)) {
    throw new BillingError("unsupported_plan", "This plan is not available for self-serve checkout.", 400);
  }

  if (!isStripeConfigured()) {
    throw new BillingError("stripe_not_configured", "Stripe is not configured for this deployment.", 503);
  }

  const workspace = await ensureDefaultWorkspace(client, user);
  const customerId = await getOrCreateStripeCustomer(client, user, workspace);
  const priceId = getPriceId(planKey);
  const appUrl = getAppUrl().replace(/\/+$/, "");
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=cancelled`,
    client_reference_id: workspace.workspaceId ?? user.id,
    metadata: {
      userId: user.id,
      workspaceId: workspace.workspaceId ?? "",
      planKey,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        workspaceId: workspace.workspaceId ?? "",
        planKey,
      },
    },
  });

  if (!session.url) {
    throw new BillingError("checkout_url_missing", "Stripe did not return a checkout URL.", 502);
  }

  return { url: session.url };
}

export async function createBillingPortalSession(client: SupabaseClient, user: User) {
  if (!isStripeConfigured()) {
    throw new BillingError("stripe_not_configured", "Stripe is not configured for this deployment.", 503);
  }

  const workspace = await ensureDefaultWorkspace(client, user);
  const subscription = await ensureFreeSubscription(client, workspace);
  const customerId = subscription.stripe_customer_id || await getOrCreateStripeCustomer(client, user, workspace);
  const appUrl = getAppUrl().replace(/\/+$/, "");
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings?billing=portal-return`,
  });

  return { url: session.url };
}

async function upsertSubscriptionFromStripe(
  client: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  const metadata = subscription.metadata ?? {};
  const workspaceId = metadata.workspaceId || null;
  const primaryItem = subscription.items.data[0] ?? null;
  const priceId = primaryItem?.price.id ?? null;
  const planKey = (metadata.planKey as PlanKey | undefined) ?? getPlanFromPriceId(priceId);

  if (!workspaceId) return;

  const { error } = await client.from("workspace_subscriptions").upsert(
    [
      {
        workspace_id: workspaceId,
        plan_key: subscription.status === "canceled" ? "free" : planKey,
        status: subscription.status,
        stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        current_period_start: toUnixDate(primaryItem?.current_period_start),
        current_period_end: toUnixDate(primaryItem?.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_end: toUnixDate(subscription.trial_end),
        seats: primaryItem?.quantity ?? 1,
        metadata,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "workspace_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function handleCheckoutCompleted(client: SupabaseClient, session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId || null;
  const userId = session.metadata?.userId || null;

  if (workspaceId && userId && typeof session.customer === "string") {
    const { error } = await client.from("billing_customers").upsert(
      [
        {
          user_id: userId,
          workspace_id: workspaceId,
          stripe_customer_id: session.customer,
          email: session.customer_details?.email ?? null,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "workspace_id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (typeof session.subscription === "string") {
    const subscription = await getStripeClient().subscriptions.retrieve(session.subscription);
    await upsertSubscriptionFromStripe(client, subscription);
  }
}

export async function handleStripeWebhook(client: SupabaseClient, rawBody: string, signature: string | null) {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    throw new BillingError("stripe_webhook_not_configured", "Stripe webhook secret is not configured.", 503);
  }

  if (!signature) {
    throw new BillingError("stripe_signature_missing", "Stripe signature is missing.", 400);
  }

  const stripe = getStripeClient();
  const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

  const { data: existing, error: existingError } = await client
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return { received: true, duplicate: true };
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(client, event.data.object as Stripe.Checkout.Session);
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await upsertSubscriptionFromStripe(client, event.data.object as Stripe.Subscription);
  }

  const object = event.data.object as { metadata?: Stripe.Metadata };
  const { error: eventError } = await client.from("billing_events").insert([
    {
      workspace_id: object.metadata?.workspaceId || null,
      stripe_event_id: event.id,
      event_type: event.type,
      payload: {
        livemode: event.livemode,
        created: event.created,
        object: event.data.object.object,
      },
    },
  ]);

  if (eventError) {
    if (/duplicate|23505|stripe_event_id/i.test(eventError.message)) {
      return { received: true, duplicate: true };
    }

    throw new Error(eventError.message);
  }

  return { received: true, duplicate: false };
}
