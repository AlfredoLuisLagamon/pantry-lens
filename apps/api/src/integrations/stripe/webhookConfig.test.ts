import { describe, expect, it } from "vitest";

import { AppError } from "../../errors/AppError";
import { loadStripeWebhookConfig } from "./webhookConfig";

describe("loadStripeWebhookConfig", () => {
  it("loads webhook variables", () => {
    expect(
      loadStripeWebhookConfig({
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_WEBHOOK_SECRET: "whsec_example",
      }),
    ).toEqual({
      secretKey: "sk_test_example",
      webhookSecret: "whsec_example",
    });
  });

  it("fails with STRIPE_WEBHOOK_CONFIGURATION when variables are missing", () => {
    expect(() => loadStripeWebhookConfig({})).toThrow(AppError);
    try {
      loadStripeWebhookConfig({});
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 503,
        code: "STRIPE_WEBHOOK_CONFIGURATION",
      });
      const message = error instanceof Error ? error.message : "";
      expect(message).toContain("STRIPE_WEBHOOK_SECRET");
      expect(message).not.toContain("whsec_");
    }
  });
});
