import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../db/prisma";
import { AppError } from "../errors/AppError";
import { getDemoUser } from "../services/demoUser";

const findUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;

const baseUser = {
  id: "user_1",
  email: "demo@pantry-lens.local",
  displayName: "Demo User",
};

describe("getDemoUser", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("returns hasNutritionAccess false when user has no subscription", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      subscription: null,
    });

    await expect(getDemoUser()).resolves.toEqual({
      ...baseUser,
      subscription: null,
      hasNutritionAccess: false,
    });
  });

  it("returns hasNutritionAccess true for active subscription", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      subscription: {
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-10-05T00:00:00.000Z"),
      },
    });

    const result = await getDemoUser();
    expect(result.hasNutritionAccess).toBe(true);
    expect(result.subscription).toEqual({
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-10-05T00:00:00.000Z",
    });
    expect(result).not.toHaveProperty("stripeCustomerId");
    expect(JSON.stringify(result)).not.toContain("sub_");
    expect(JSON.stringify(result)).not.toContain("price_");
  });

  it("returns hasNutritionAccess true for trialing subscription", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      subscription: {
        status: "trialing",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    });

    await expect(getDemoUser()).resolves.toMatchObject({
      hasNutritionAccess: true,
      subscription: {
        status: "trialing",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    });
  });

  it("returns hasNutritionAccess false for past_due", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      subscription: {
        status: "past_due",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-10-05T00:00:00.000Z"),
      },
    });

    await expect(getDemoUser()).resolves.toMatchObject({
      hasNutritionAccess: false,
      subscription: { status: "past_due" },
    });
  });

  it("keeps access when active and cancelAtPeriodEnd is true", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      subscription: {
        status: "active",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date("2026-10-05T00:00:00.000Z"),
      },
    });

    await expect(getDemoUser()).resolves.toMatchObject({
      hasNutritionAccess: true,
      subscription: {
        status: "active",
        cancelAtPeriodEnd: true,
        currentPeriodEnd: "2026-10-05T00:00:00.000Z",
      },
    });
  });

  it("returns hasNutritionAccess false for unknown status", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      subscription: {
        status: "unexpected",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
      },
    });

    await expect(getDemoUser()).resolves.toMatchObject({
      hasNutritionAccess: false,
      subscription: { status: "unexpected" },
    });
  });

  it("does not expose Stripe integration identifiers", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      subscription: {
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: new Date("2026-10-05T00:00:00.000Z"),
        // If Prisma ever returned these, mapping must still omit them.
        stripeSubscriptionId: "sub_secret",
        stripePriceId: "price_secret",
      },
    });

    const result = await getDemoUser();
    expect(result.subscription).toEqual({
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2026-10-05T00:00:00.000Z",
    });
    expect(result).not.toHaveProperty("stripeCustomerId");
    expect(result.subscription).not.toHaveProperty("stripeSubscriptionId");
    expect(result.subscription).not.toHaveProperty("stripePriceId");
  });

  it("throws DEMO_USER_MISSING when seed has not been run", async () => {
    findUnique.mockResolvedValue(null);

    await expect(getDemoUser()).rejects.toMatchObject({
      statusCode: 503,
      code: "DEMO_USER_MISSING",
    } satisfies Partial<AppError>);
  });

  it("throws DATABASE_UNAVAILABLE when Prisma cannot connect", async () => {
    findUnique.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(getDemoUser()).rejects.toMatchObject({
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
    } satisfies Partial<AppError>);
  });
});
