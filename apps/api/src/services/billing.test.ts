import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../integrations/stripe/client", () => ({
  getStripeBilling: vi.fn(),
}));

import { prisma } from "../db/prisma";
import { AppError } from "../errors/AppError";
import { getStripeBilling } from "../integrations/stripe/client";
import { createCheckoutSession } from "../services/billing";

const findUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const updateUser = prisma.user.update as ReturnType<typeof vi.fn>;
const getStripeBillingMock = getStripeBilling as ReturnType<typeof vi.fn>;

const baseUser = {
  id: "user_1",
  email: "demo@pantry-lens.local",
  stripeCustomerId: null as string | null,
  subscription: null as { status: string } | null,
};

describe("createCheckoutSession", () => {
  const customersCreate = vi.fn();
  const sessionsCreate = vi.fn();

  beforeEach(() => {
    findUnique.mockReset();
    updateUser.mockReset();
    getStripeBillingMock.mockReset();
    customersCreate.mockReset();
    sessionsCreate.mockReset();

    getStripeBillingMock.mockReturnValue({
      stripe: {
        customers: { create: customersCreate },
        checkout: { sessions: { create: sessionsCreate } },
      },
      config: {
        secretKey: "sk_test_mock",
        priceId: "price_test_123",
        successUrl: "http://localhost:3000/billing/success",
        cancelUrl: "http://localhost:3000/billing/cancel",
      },
    });
  });

  it("reuses an existing Stripe customer and creates a Checkout Session", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      stripeCustomerId: "cus_existing",
    });
    sessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });

    await expect(createCheckoutSession()).resolves.toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });

    expect(customersCreate).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
    expect(sessionsCreate).toHaveBeenCalledWith({
      mode: "subscription",
      customer: "cus_existing",
      line_items: [{ price: "price_test_123", quantity: 1 }],
      success_url: "http://localhost:3000/billing/success",
      cancel_url: "http://localhost:3000/billing/cancel",
      client_reference_id: "user_1",
      metadata: { userId: "user_1" },
      subscription_data: {
        metadata: { userId: "user_1" },
      },
    });
  });

  it("creates and persists a Stripe customer when missing", async () => {
    findUnique.mockResolvedValue({ ...baseUser });
    customersCreate.mockResolvedValue({ id: "cus_new" });
    updateUser.mockResolvedValue({});
    sessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_new",
    });

    await expect(createCheckoutSession()).resolves.toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_new",
    });

    expect(customersCreate).toHaveBeenCalledWith({
      email: "demo@pantry-lens.local",
      metadata: { userId: "user_1" },
    });
    expect(updateUser).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { stripeCustomerId: "cus_new" },
    });
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new" }),
    );
  });

  it("rejects active subscriptions without creating Checkout", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      stripeCustomerId: "cus_existing",
      subscription: { status: "active" },
    });

    await expect(createCheckoutSession()).rejects.toMatchObject({
      statusCode: 409,
      code: "ALREADY_SUBSCRIBED",
    } satisfies Partial<AppError>);

    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("rejects trialing subscriptions without creating Checkout", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      stripeCustomerId: "cus_existing",
      subscription: { status: "trialing" },
    });

    await expect(createCheckoutSession()).rejects.toMatchObject({
      statusCode: 409,
      code: "ALREADY_SUBSCRIBED",
    } satisfies Partial<AppError>);

    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("allows checkout when subscription is canceled", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      stripeCustomerId: "cus_existing",
      subscription: { status: "canceled" },
    });
    sessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_cancel",
    });

    await expect(createCheckoutSession()).resolves.toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_cancel",
    });
    expect(sessionsCreate).toHaveBeenCalled();
  });

  it("fails clearly when Stripe omits the hosted Checkout URL", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      stripeCustomerId: "cus_existing",
    });
    sessionsCreate.mockResolvedValue({ url: null });

    await expect(createCheckoutSession()).rejects.toMatchObject({
      statusCode: 502,
      code: "STRIPE_CHECKOUT_FAILED",
      message: "Unable to start subscription checkout.",
    } satisfies Partial<AppError>);
  });

  it("normalizes Stripe SDK failures", async () => {
    findUnique.mockResolvedValue({
      ...baseUser,
      stripeCustomerId: "cus_existing",
    });
    sessionsCreate.mockRejectedValue(
      Object.assign(new Error("card_error detail"), { type: "StripeCardError" }),
    );

    await expect(createCheckoutSession()).rejects.toMatchObject({
      statusCode: 502,
      code: "STRIPE_CHECKOUT_FAILED",
      message: "Unable to start subscription checkout.",
    } satisfies Partial<AppError>);
  });

  it("throws DATABASE_UNAVAILABLE when Prisma cannot connect", async () => {
    findUnique.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(createCheckoutSession()).rejects.toMatchObject({
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
    } satisfies Partial<AppError>);
  });
});
