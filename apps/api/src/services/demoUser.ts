import { config } from "../config/env";
import { prisma } from "../db/prisma";
import { AppError } from "../errors/AppError";
import { hasNutritionAccess } from "../lib/entitlements";

export type SubscriptionSummary = {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type DemoUserResponse = {
  id: string;
  email: string;
  displayName: string;
  subscription: SubscriptionSummary | null;
  hasNutritionAccess: boolean;
};

export async function getDemoUser(): Promise<DemoUserResponse> {
  let user;

  try {
    user = await prisma.user.findUnique({
      where: { email: config.demoUserEmail },
      select: {
        id: true,
        email: true,
        displayName: true,
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
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

  const subscription: SubscriptionSummary | null = user.subscription
    ? {
        status: user.subscription.status,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
        currentPeriodEnd: user.subscription.currentPeriodEnd
          ? user.subscription.currentPeriodEnd.toISOString()
          : null,
      }
    : null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    subscription,
    hasNutritionAccess: hasNutritionAccess(subscription?.status),
  };
}
