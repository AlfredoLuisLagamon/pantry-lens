import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { prisma } from "../db/prisma";
import { AppError } from "../errors/AppError";
import { getStripeWebhook } from "../integrations/stripe/client";

export type StripeWebhookResult = {
  received: true;
};

export type NormalizedSubscriptionState = {
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

const RELEVANT_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export function verifyStripeWebhookEvent(
  rawBody: Buffer | string,
  signature: string | string[] | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Stripe.Event {
  if (!signature || (Array.isArray(signature) && signature.length === 0)) {
    throw new AppError(
      400,
      "STRIPE_SIGNATURE_MISSING",
      "Missing Stripe-Signature header.",
    );
  }

  const header = Array.isArray(signature) ? signature[0] : signature;
  const { stripe, config } = getStripeWebhook(env);

  try {
    return stripe.webhooks.constructEvent(
      rawBody,
      header,
      config.webhookSecret,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe] webhook signature verification failed", {
      message,
    });
    throw new AppError(
      400,
      "STRIPE_SIGNATURE_INVALID",
      "Invalid Stripe webhook signature.",
    );
  }
}

export async function handleStripeWebhook(options: {
  rawBody: Buffer | string;
  signature: string | string[] | undefined;
}): Promise<StripeWebhookResult> {
  const event = verifyStripeWebhookEvent(options.rawBody, options.signature);
  return processStripeEvent(event);
}

export async function processStripeEvent(
  event: Stripe.Event,
): Promise<StripeWebhookResult> {
  try {
    const existing = await prisma.stripeEvent.findUnique({
      where: { id: event.id },
    });
    if (existing) {
      return { received: true };
    }
  } catch {
    throw new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
    );
  }

  if (!RELEVANT_EVENT_TYPES.has(event.type)) {
    if (process.env.NODE_ENV !== "test") {
      console.info(`[stripe] ignoring unsupported event type: ${event.type}`);
    }
    return { received: true };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionCreatedOrUpdated(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        return { received: true };
    }
  } catch (error) {
    if (isStripeEventIdConflict(error)) {
      return { received: true };
    }
    if (error instanceof AppError) {
      throw error;
    }
    console.error("[stripe] webhook processing failed", {
      type: event.type,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new AppError(
      502,
      "STRIPE_WEBHOOK_PROCESSING_FAILED",
      "Unable to process Stripe webhook event.",
    );
  }

  return { received: true };
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const subscriptionId = extractSubscriptionId(session.subscription);

  if (!subscriptionId) {
    throw new AppError(
      502,
      "STRIPE_WEBHOOK_PROCESSING_FAILED",
      "Checkout session completed without a subscription id.",
    );
  }

  const subscription = await retrieveSubscription(subscriptionId);
  const userId = await resolveUserId({
    metadataUserId:
      subscription.metadata.userId ?? session.metadata?.userId ?? null,
    clientReferenceId: session.client_reference_id,
    stripeCustomerId: extractCustomerId(session.customer),
  });

  const state = normalizeSubscriptionState(subscription, userId);
  await persistSubscriptionAndEvent(event, state, { allowOverwrite: true });
}

async function handleSubscriptionCreatedOrUpdated(event: Stripe.Event) {
  const snapshot = event.data.object as Stripe.Subscription;
  const subscription = await retrieveSubscription(snapshot.id);
  const userId = await resolveUserId({
    metadataUserId: subscription.metadata.userId ?? null,
    stripeCustomerId: extractCustomerId(subscription.customer),
  });

  const state = normalizeSubscriptionState(subscription, userId);
  await persistSubscriptionAndEvent(event, state, { allowOverwrite: true });
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const snapshot = event.data.object as Stripe.Subscription;
  const userId = await resolveUserId({
    metadataUserId: snapshot.metadata.userId ?? null,
    stripeCustomerId: extractCustomerId(snapshot.customer),
  });

  // Prefer the verified event snapshot for deleted subscriptions.
  const state: NormalizedSubscriptionState = {
    ...normalizeSubscriptionState(snapshot, userId),
    status: "canceled",
  };

  await persistSubscriptionAndEvent(event, state, {
    allowOverwrite: false,
  });
}

async function retrieveSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const { stripe } = getStripeWebhook();
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error("[stripe] subscriptions.retrieve failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw new AppError(
      502,
      "STRIPE_WEBHOOK_PROCESSING_FAILED",
      "Unable to retrieve Stripe subscription state.",
    );
  }
}

export function normalizeSubscriptionState(
  subscription: Pick<
    Stripe.Subscription,
    "id" | "status" | "cancel_at_period_end" | "items"
  >,
  userId: string,
): NormalizedSubscriptionState {
  const item = subscription.items?.data?.[0];
  if (!item) {
    throw new AppError(
      502,
      "STRIPE_WEBHOOK_PROCESSING_FAILED",
      "Stripe subscription is missing line items.",
    );
  }

  const stripePriceId = extractPriceId(item.price);
  if (!stripePriceId) {
    throw new AppError(
      502,
      "STRIPE_WEBHOOK_PROCESSING_FAILED",
      "Stripe subscription item is missing a price id.",
    );
  }

  return {
    userId,
    stripeSubscriptionId: subscription.id,
    stripePriceId,
    status: subscription.status,
    currentPeriodEnd: unixSecondsToDate(item.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  };
}

export function unixSecondsToDate(
  value: number | null | undefined,
): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return new Date(value * 1000);
}

async function resolveUserId(options: {
  metadataUserId?: string | null;
  clientReferenceId?: string | null;
  stripeCustomerId?: string | null;
}): Promise<string> {
  const candidate =
    options.metadataUserId?.trim() ||
    options.clientReferenceId?.trim() ||
    null;

  try {
    if (candidate) {
      const user = await prisma.user.findUnique({
        where: { id: candidate },
        select: { id: true },
      });
      if (!user) {
        throw new AppError(
          502,
          "STRIPE_SUBSCRIPTION_MAPPING_FAILED",
          "Stripe subscription could not be mapped to a local user.",
        );
      }
      return user.id;
    }

    if (options.stripeCustomerId) {
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: options.stripeCustomerId },
        select: { id: true },
      });
      if (!user) {
        throw new AppError(
          502,
          "STRIPE_SUBSCRIPTION_MAPPING_FAILED",
          "Stripe subscription could not be mapped to a local user.",
        );
      }
      return user.id;
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
    );
  }

  throw new AppError(
    502,
    "STRIPE_SUBSCRIPTION_MAPPING_FAILED",
    "Stripe subscription could not be mapped to a local user.",
  );
}

async function persistSubscriptionAndEvent(
  event: Stripe.Event,
  state: NormalizedSubscriptionState,
  options: { allowOverwrite: boolean },
): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const alreadyProcessed = await tx.stripeEvent.findUnique({
        where: { id: event.id },
      });
      if (alreadyProcessed) {
        return;
      }

      const current = await tx.subscription.findUnique({
        where: { userId: state.userId },
      });

      const shouldWriteSubscription =
        options.allowOverwrite ||
        !current ||
        current.stripeSubscriptionId === state.stripeSubscriptionId;

      if (shouldWriteSubscription) {
        await tx.subscription.upsert({
          where: { userId: state.userId },
          create: {
            userId: state.userId,
            stripeSubscriptionId: state.stripeSubscriptionId,
            stripePriceId: state.stripePriceId,
            status: state.status,
            currentPeriodEnd: state.currentPeriodEnd,
            cancelAtPeriodEnd: state.cancelAtPeriodEnd,
          },
          update: {
            stripeSubscriptionId: state.stripeSubscriptionId,
            stripePriceId: state.stripePriceId,
            status: state.status,
            currentPeriodEnd: state.currentPeriodEnd,
            cancelAtPeriodEnd: state.cancelAtPeriodEnd,
          },
        });
      }

      await tx.stripeEvent.create({
        data: {
          id: event.id,
          type: event.type,
        },
      });
    });
  } catch (error) {
    if (isStripeEventIdConflict(error)) {
      throw error;
    }
    if (error instanceof AppError) {
      throw error;
    }
    console.error("[stripe] subscription sync transaction failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
    );
  }
}

function extractSubscriptionId(
  value: string | Stripe.Subscription | null,
): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return value.id ?? null;
}

function extractCustomerId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return value.id ?? null;
}

function extractPriceId(
  price: string | Stripe.Price | null | undefined,
): string | null {
  if (!price) {
    return null;
  }
  if (typeof price === "string") {
    return price;
  }
  return price.id ?? null;
}

function isStripeEventIdConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes("id") || target.includes("StripeEvent_pkey");
  }
  if (typeof target === "string") {
    return target.includes("id") || target.includes("StripeEvent");
  }
  // StripeEvent only has a primary-key unique constraint on id.
  return true;
}
