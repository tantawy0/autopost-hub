export type PlanKey = "free" | "creator" | "pro" | "agency" | "enterprise";

export type PlanLimits = {
  channels: number | null;
  scheduledPostsMonthly: number | null;
  aiRequestsMonthly: number | null;
  mediaStorageMb: number | null;
  teamMembers: number | null;
  analyticsDays: number | null;
};

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  description: string;
  priceLabel: string;
  billingLabel: string;
  stripePriceEnv?: string;
  limits: PlanLimits;
  features: string[];
  publicSignup: boolean;
};

export const PLAN_DEFINITIONS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: "free",
    name: "Free",
    description: "For trying the product with a real creator workspace.",
    priceLabel: "$0",
    billingLabel: "forever",
    limits: {
      channels: 1,
      scheduledPostsMonthly: 25,
      aiRequestsMonthly: 25,
      mediaStorageMb: 250,
      teamMembers: 1,
      analyticsDays: 7,
    },
    features: ["1 channel", "25 scheduled posts/month", "Heuristic AI assistant", "Basic analytics"],
    publicSignup: true,
  },
  creator: {
    key: "creator",
    name: "Creator",
    description: "For solo creators publishing consistently.",
    priceLabel: "$12",
    billingLabel: "per month",
    stripePriceEnv: "STRIPE_PRICE_CREATOR",
    limits: {
      channels: 3,
      scheduledPostsMonthly: 100,
      aiRequestsMonthly: 200,
      mediaStorageMb: 1000,
      teamMembers: 1,
      analyticsDays: 30,
    },
    features: ["3 channels", "100 scheduled posts/month", "AI captions", "30-day analytics"],
    publicSignup: true,
  },
  pro: {
    key: "pro",
    name: "Pro",
    description: "For serious creators and small brands.",
    priceLabel: "$29",
    billingLabel: "per month",
    stripePriceEnv: "STRIPE_PRICE_PRO",
    limits: {
      channels: 10,
      scheduledPostsMonthly: null,
      aiRequestsMonthly: 1000,
      mediaStorageMb: 5000,
      teamMembers: 3,
      analyticsDays: 90,
    },
    features: ["10 channels", "Unlimited scheduled posts", "Pro AI assistant", "Team of 3"],
    publicSignup: true,
  },
  agency: {
    key: "agency",
    name: "Agency",
    description: "For agencies managing multiple client workflows.",
    priceLabel: "$79",
    billingLabel: "per month",
    stripePriceEnv: "STRIPE_PRICE_AGENCY",
    limits: {
      channels: null,
      scheduledPostsMonthly: null,
      aiRequestsMonthly: 5000,
      mediaStorageMb: 20000,
      teamMembers: 15,
      analyticsDays: 365,
    },
    features: ["Unlimited channels", "Approvals and roles", "Client-ready workflows", "Priority support"],
    publicSignup: true,
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description: "Custom controls for larger teams.",
    priceLabel: "Custom",
    billingLabel: "contact sales",
    limits: {
      channels: null,
      scheduledPostsMonthly: null,
      aiRequestsMonthly: null,
      mediaStorageMb: null,
      teamMembers: null,
      analyticsDays: null,
    },
    features: ["Custom limits", "SLA and DPA", "Dedicated onboarding", "Custom integrations"],
    publicSignup: false,
  },
};

export const PAID_SELF_SERVE_PLANS = ["creator", "pro", "agency"] as const;

export type PaidSelfServePlanKey = (typeof PAID_SELF_SERVE_PLANS)[number];

export function getPlanDefinition(planKey: string | null | undefined): PlanDefinition {
  if (planKey && planKey in PLAN_DEFINITIONS) {
    return PLAN_DEFINITIONS[planKey as PlanKey];
  }

  return PLAN_DEFINITIONS.free;
}

export function isPaidSelfServePlan(planKey: string): planKey is PaidSelfServePlanKey {
  return PAID_SELF_SERVE_PLANS.includes(planKey as PaidSelfServePlanKey);
}

export function formatLimit(value: number | null, suffix = "") {
  return value === null ? "Unlimited" : `${value.toLocaleString()}${suffix}`;
}
