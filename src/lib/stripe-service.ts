/**
 * Stripe Service — Handles Stripe subscription billing for RetroAI.
 *
 * Uses process.env.STRIPE_SECRET_KEY and process.env.STRIPE_WEBHOOK_SECRET.
 * If these are not set, the service returns mock responses for development.
 *
 * SERVER-ONLY: Do not import from client code.
 *
 * Plans:
 *   free:       $0/mo  — 1 retro/month, public repos, 10 members
 *   pro:        $49/mo — unlimited retros, private repos, Slack, multiple teams
 *   enterprise: $149/mo — advanced analytics, custom templates, SSO, priority support
 */

import { randomUUID } from "node:crypto";

// --- Types ---

export interface PlanConfig {
  id: string;
  name: string;
  price: number; // cents
  interval: "month" | "year";
  description: string;
  features: string[];
  priceId?: string; // Stripe Price ID
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    description: "1 retro/month, public repos, up to 10 members",
    features: [
      "1 automated retro per month",
      "Public repos only",
      "Up to 10 team members",
      "Email support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 4900, // $49.00
    interval: "month",
    description: "Unlimited retros, private repos, Slack integration",
    features: [
      "Unlimited retros",
      "Private repos",
      "Slack integration",
      "Multiple teams",
      "Priority support",
      "Advanced analytics",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 14900, // $149.00
    interval: "month",
    description: "Custom templates, SSO, dedicated support",
    features: [
      "Everything in Pro",
      "Custom retro templates",
      "SSO / SAML",
      "Dedicated account manager",
      "Custom integrations",
      "99.9% SLA",
    ],
  },
};

// --- Stripe API helpers ---

function getStripeKey(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

/**
 * Load Stripe SDK lazily. Only available when STRIPE_SECRET_KEY is set.
 */
async function getStripe() {
  const key = getStripeKey();
  if (!key) return null;
  try {
    const { default: Stripe } = await import("stripe");
    return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  } catch {
    return null;
  }
}

// --- Customer Management ---

/**
 * Create or retrieve a Stripe customer for a user.
 * Returns null if Stripe is not configured.
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name: string,
): Promise<{ customerId: string; isNew: boolean } | null> {
  const stripe = await getStripe();
  if (!stripe) {
    // Stripe not configured — return mock customer for development
    return { customerId: `mock_cus_${userId.slice(0, 8)}`, isNew: true };
  }

  // Check if user already has a Stripe customer ID stored
  const { getSubscriptionByUserId } = await import("./retroai-db");
  const existing = await getSubscriptionByUserId(userId);
  if (existing?.stripe_customer_id) {
    return { customerId: existing.stripe_customer_id, isNew: false };
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });

  return { customerId: customer.id, isNew: true };
}

// --- Checkout Session ---

/**
 * Create a Stripe Checkout Session for a subscription plan.
 * Returns the checkout URL or null if Stripe is not configured.
 */
export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  name: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; sessionId: string } | { error: string }> {
  const { userId, email, name, planId, successUrl, cancelUrl } = params;
  const plan = PLANS[planId];
  if (!plan) return { error: `Invalid plan: ${planId}` };
  if (planId === "free") return { error: "Free plan does not require checkout" };

  const stripe = await getStripe();
  if (!stripe) {
    // Stripe not configured — return mock checkout URL for development
    const mockId = `mock_cs_${randomUUID().slice(0, 8)}`;
    return {
      url: `/dashboard?checkout=mock&plan=${planId}&session_id=${mockId}`,
      sessionId: mockId,
    };
  }

  const customer = await getOrCreateCustomer(userId, email, name);
  if (!customer) return { error: "Failed to create customer" };

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customer.customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `RetroAI ${plan.name}`,
              description: plan.description,
            },
            unit_amount: plan.price,
            recurring: { interval: plan.interval },
          },
          quantity: 1,
        },
      ],
      metadata: { userId, planId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) return { error: "Failed to create checkout session" };
    return { url: session.url, sessionId: session.id };
  } catch (err) {
    console.error("Stripe createCheckoutSession error:", err);
    return { error: "Failed to create checkout session" };
  }
}

/**
 * Create a billing portal session for managing subscriptions.
 */
export async function createBillingPortalSession(params: {
  userId: string;
  returnUrl: string;
}): Promise<{ url: string } | { error: string }> {
  const { userId, returnUrl } = params;
  const stripe = await getStripe();
  if (!stripe) {
    // Mock portal for development
    return { url: returnUrl };
  }

  const { getSubscriptionByUserId } = await import("./retroai-db");
  const sub = await getSubscriptionByUserId(userId);
  if (!sub?.stripe_customer_id) return { error: "No customer found" };

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: returnUrl,
    });
    return { url: session.url };
  } catch (err) {
    console.error("Stripe createBillingPortalSession error:", err);
    return { error: "Failed to create portal session" };
  }
}

// --- Webhook Handler ---

/**
 * Handle a Stripe webhook event.
 * Returns the event type and whether it was handled successfully.
 */
export async function handleWebhook(
  rawBody: string,
  signature: string,
): Promise<{ type: string; handled: boolean } | { error: string }> {
  const stripe = await getStripe();
  const secret = getWebhookSecret();

  if (!stripe || !secret) {
    // Stripe not configured — accept webhook for development
    try {
      const event = JSON.parse(rawBody) as { type: string };
      return { type: event.type, handled: true };
    } catch {
      return { error: "Invalid webhook payload" };
    }
  }

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    const { handleSubscriptionEvent } = await import("./retroai-db");

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId || "pro";
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (userId && subscriptionId) {
          await handleSubscriptionEvent(
            userId,
            customerId,
            subscriptionId,
            planId,
            "active",
            null,
          );
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as any;
        const userId = sub.metadata?.userId || sub.customer?.metadata?.userId;
        const planId = sub.items?.data?.[0]?.price?.metadata?.planId || "pro";
        const status = sub.status === "active" || sub.status === "trialing" ? "active" : "past_due";
        const currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();

        if (userId) {
          await handleSubscriptionEvent(
            userId,
            sub.customer as string,
            sub.id as string,
            planId,
            status,
            currentPeriodEnd,
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const deletedSub = event.data.object as any;
        const deletedUserId = deletedSub.metadata?.userId || deletedSub.customer?.metadata?.userId;
        if (deletedUserId) {
          await handleSubscriptionEvent(
            deletedUserId,
            deletedSub.customer as string,
            deletedSub.id as string,
            "free",
            "canceled",
            null,
          );
        }
        break;
      }
    }

    return { type: event.type, handled: true };
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return { error: "Webhook signature verification failed" };
  }
}

// --- Subscription Status ---

/**
 * Get the current subscription status for a user.
 */
export async function getUserSubscription(userId: string): Promise<{
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}> {
  const { getSubscriptionByUserId } = await import("./retroai-db");
  const sub = await getSubscriptionByUserId(userId);
  if (!sub) {
    return {
      plan: "free",
      status: "active",
      currentPeriodEnd: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }
  return {
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
    stripeCustomerId: sub.stripe_customer_id,
    stripeSubscriptionId: sub.stripe_subscription_id,
  };
}

/**
 * Check if a user can generate a retro report based on their plan.
 * Free plan: 1 retro/month
 * Pro/Enterprise: unlimited
 */
export async function canGenerateReport(userId: string): Promise<{
  allowed: boolean;
  limit: number;
  used: number;
  message: string;
}> {
  const { getSubscriptionByUserId, getReportsForUser } = await import("./retroai-db");
  const sub = await getSubscriptionByUserId(userId);
  const plan = sub?.plan || "free";

  if (plan !== "free") {
    return { allowed: true, limit: Infinity, used: 0, message: "" };
  }

  // Free plan: count reports generated this month
  const reports = await getReportsForUser(userId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const reportsThisMonth = reports.filter(
    (r: any) => r.created_at >= startOfMonth,
  ).length;

  const limit = 1;
  if (reportsThisMonth >= limit) {
    return {
      allowed: false,
      limit,
      used: reportsThisMonth,
      message: `Free plan includes ${limit} retro report per month. Upgrade to Pro for unlimited retros.`,
    };
  }

  return {
    allowed: true,
    limit,
    used: reportsThisMonth,
    message: `${limit - reportsThisMonth} retro report(s) remaining this month`,
  };
}