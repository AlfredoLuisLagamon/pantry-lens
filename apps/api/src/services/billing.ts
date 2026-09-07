import { config } from "../config/env";
import { prisma } from "../db/prisma";
import { AppError } from "../errors/AppError";
import { getStripeBilling } from "../integrations/stripe/client";
import { hasNutritionAccess } from "../lib/entitlements";

export type CheckoutSessionResponse = {
  url: string;
};

export async function createCheckoutSession(): Promise<CheckoutSessionResponse> {
  const { stripe, config: stripeConfig } = getStripeBilling();

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: config.demoUserEmail },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        subscription: {
          select: {
            status: true,
          },
        },
      },
    });
  } catch {
    throw new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
    );
  }

  if (!user) {
    throw new AppError(
      503,
      "DEMO_USER_MISSING",
      "Demo user not found. Run database migrations and seed before using the API.",
    );
  }

  if (hasNutritionAccess(user.subscription?.status)) {
    throw new AppError(
      409,
      "ALREADY_SUBSCRIBED",
      "An active or trialing subscription already exists for this account.",
    );
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    let customer;
    try {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
    } catch (error) {
      logStripeFailure("customers.create", error);
      throw new AppError(
        502,
        "STRIPE_CHECKOUT_FAILED",
        "Unable to start subscription checkout.",
      );
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    } catch {
      throw new AppError(
        503,
        "DATABASE_UNAVAILABLE",
        "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
      );
    }

    customerId = customer.id;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: stripeConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: stripeConfig.successUrl,
      cancel_url: stripeConfig.cancelUrl,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    });

    if (!session.url) {
      throw new AppError(
        502,
        "STRIPE_CHECKOUT_FAILED",
        "Unable to start subscription checkout.",
      );
    }

    return { url: session.url };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logStripeFailure("checkout.sessions.create", error);
    throw new AppError(
      502,
      "STRIPE_CHECKOUT_FAILED",
      "Unable to start subscription checkout.",
    );
  }
}

function logStripeFailure(operation: string, error: unknown) {
  const type =
    error && typeof error === "object" && "type" in error
      ? String((error as { type: unknown }).type)
      : undefined;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[stripe] ${operation} failed`, {
    type,
    message,
  });
}
