import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/billing", () => ({
  createCheckoutSession: vi.fn(),
}));

import { app } from "../app";
import { AppError } from "../errors/AppError";
import { createCheckoutSession } from "../services/billing";

const createCheckoutSessionMock =
  createCheckoutSession as ReturnType<typeof vi.fn>;

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    createCheckoutSessionMock.mockReset();
  });

  it("returns the hosted Checkout URL", async () => {
    createCheckoutSessionMock.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });

    const response = await request(app)
      .post("/api/billing/checkout")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
  });

  it("returns 409 when already subscribed", async () => {
    createCheckoutSessionMock.mockRejectedValue(
      new AppError(
        409,
        "ALREADY_SUBSCRIBED",
        "An active or trialing subscription already exists for this account.",
      ),
    );

    const response = await request(app).post("/api/billing/checkout").send({});

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "ALREADY_SUBSCRIBED",
        message:
          "An active or trialing subscription already exists for this account.",
      },
    });
  });

  it("returns configuration failure when Stripe env is incomplete", async () => {
    createCheckoutSessionMock.mockRejectedValue(
      new AppError(
        503,
        "STRIPE_CONFIGURATION",
        "Stripe billing is not configured. Missing: STRIPE_SECRET_KEY.",
      ),
    );

    const response = await request(app).post("/api/billing/checkout").send({});

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("STRIPE_CONFIGURATION");
  });

  it("returns normalized Stripe failure", async () => {
    createCheckoutSessionMock.mockRejectedValue(
      new AppError(
        502,
        "STRIPE_CHECKOUT_FAILED",
        "Unable to start subscription checkout.",
      ),
    );

    const response = await request(app).post("/api/billing/checkout").send({});

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: {
        code: "STRIPE_CHECKOUT_FAILED",
        message: "Unable to start subscription checkout.",
      },
    });
  });
});
