import { AppError } from "../../errors/AppError";

export type StripeBillingConfig = {
  secretKey: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
};

function requireNonEmpty(
  env: NodeJS.ProcessEnv,
  key: string,
  missing: string[],
): string | undefined {
  const value = env[key]?.trim();
  if (!value) {
    missing.push(key);
    return undefined;
  }
  return value;
}

/**
 * Lazy Stripe billing config — only required when creating Checkout Sessions.
 * Core API routes must keep working when these variables are unset.
 */
export function loadStripeBillingConfig(
  env: NodeJS.ProcessEnv = process.env,
): StripeBillingConfig {
  const missing: string[] = [];

  const secretKey = requireNonEmpty(env, "STRIPE_SECRET_KEY", missing);
  const priceId = requireNonEmpty(env, "STRIPE_PRICE_ID", missing);
  const successUrl = requireNonEmpty(env, "CHECKOUT_SUCCESS_URL", missing);
  const cancelUrl = requireNonEmpty(env, "CHECKOUT_CANCEL_URL", missing);

  if (missing.length > 0) {
    throw new AppError(
      503,
      "STRIPE_CONFIGURATION",
      `Stripe billing is not configured. Missing: ${missing.join(", ")}.`,
    );
  }

  return {
    secretKey: secretKey!,
    priceId: priceId!,
    successUrl: successUrl!,
    cancelUrl: cancelUrl!,
  };
}
