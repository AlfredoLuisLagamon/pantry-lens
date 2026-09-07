import { describe, expect, it } from "vitest";

import { AppError } from "../../errors/AppError";
import { loadStripeBillingConfig } from "./config";

describe("loadStripeBillingConfig", () => {
  const complete = {
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_PRICE_ID: "price_example",
    CHECKOUT_SUCCESS_URL: "http://localhost:3000/billing/success",
    CHECKOUT_CANCEL_URL: "http://localhost:3000/billing/cancel",
  };

  it("loads Stripe billing variables", () => {
    expect(loadStripeBillingConfig(complete)).toEqual({
      secretKey: "sk_test_example",
      priceId: "price_example",
      successUrl: complete.CHECKOUT_SUCCESS_URL,
      cancelUrl: complete.CHECKOUT_CANCEL_URL,
    });
  });

  it("fails with STRIPE_CONFIGURATION when variables are missing", () => {
    expect(() => loadStripeBillingConfig({})).toThrow(AppError);
    try {
      loadStripeBillingConfig({});
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 503,
        code: "STRIPE_CONFIGURATION",
      });
      const message = error instanceof Error ? error.message : "";
      expect(message).toContain("STRIPE_SECRET_KEY");
      expect(message).not.toContain("sk_test");
    }
  });
});
