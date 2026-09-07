import request from "supertest";
import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../integrations/stripe/client", () => ({
  getStripeWebhook: vi.fn(),
  getStripeBilling: vi.fn(),
  resetStripeClientForTests: vi.fn(),
}));

vi.mock("../db/prisma", () => ({
  prisma: {
    stripeEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { app } from "../app";
import { prisma } from "../db/prisma";
import { getStripeWebhook } from "../integrations/stripe/client";

const WEBHOOK_SECRET = "whsec_route_test";
const stripe = new Stripe("sk_test_route");
const getStripeWebhookMock = getStripeWebhook as ReturnType<typeof vi.fn>;
const findEvent = prisma.stripeEvent.findUnique as ReturnType<typeof vi.fn>;

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    getStripeWebhookMock.mockReset();
    findEvent.mockReset();

    getStripeWebhookMock.mockReturnValue({
      stripe,
      config: {
        secretKey: "sk_test_route",
        webhookSecret: WEBHOOK_SECRET,
      },
    });

    findEvent.mockResolvedValue({
      id: "evt_route",
      type: "customer.created",
      processedAt: new Date(),
    });
  });

  it("accepts a valid signed raw body", async () => {
    const payloadObject = {
      id: "evt_route",
      object: "event",
      api_version: null,
      created: 1,
      type: "customer.created",
      livemode: false,
      pending_webhooks: 0,
      request: null,
      data: { object: { id: "cus_1", object: "customer" } },
    };
    const payload = JSON.stringify(payloadObject);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
    });

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", signature)
      // Send the exact signed string so express.raw receives matching bytes.
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });

  it("rejects missing signatures with 400", async () => {
    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/json")
      .send(Buffer.from("{}"));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("STRIPE_SIGNATURE_MISSING");
  });

  it("rejects invalid signatures with 400", async () => {
    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", "t=1,v1=not-valid")
      .send(Buffer.from("{}"));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("STRIPE_SIGNATURE_INVALID");
  });

  it("keeps normal JSON routes working after raw webhook mounting", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "pantry-lens-api",
    });
  });
});
