import Stripe from "stripe";

import {
  loadStripeBillingConfig,
  type StripeBillingConfig,
} from "./config";
import {
  loadStripeWebhookConfig,
  type StripeWebhookConfig,
} from "./webhookConfig";

let stripeClient: Stripe | null = null;
let cachedSecretKey: string | null = null;

export type StripeBillingContext = {
  stripe: Stripe;
  config: StripeBillingConfig;
};

export type StripeWebhookContext = {
  stripe: Stripe;
  config: StripeWebhookConfig;
};

function getOrCreateStripeClient(secretKey: string): Stripe {
  if (!stripeClient || cachedSecretKey !== secretKey) {
    stripeClient = new Stripe(secretKey);
    cachedSecretKey = secretKey;
  }
  return stripeClient;
}

export function getStripeBilling(
  env: NodeJS.ProcessEnv = process.env,
): StripeBillingContext {
  const config = loadStripeBillingConfig(env);
  return {
    stripe: getOrCreateStripeClient(config.secretKey),
    config,
  };
}

export function getStripeWebhook(
  env: NodeJS.ProcessEnv = process.env,
): StripeWebhookContext {
  const config = loadStripeWebhookConfig(env);
  return {
    stripe: getOrCreateStripeClient(config.secretKey),
    config,
  };
}

/** Test helper — clears the cached SDK client. */
export function resetStripeClientForTests() {
  stripeClient = null;
  cachedSecretKey = null;
}
