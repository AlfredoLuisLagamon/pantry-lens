import { AppError } from "../../errors/AppError";

export type StripeWebhookConfig = {
  secretKey: string;
  webhookSecret: string;
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
 * Lazy webhook config — only required when handling Stripe webhooks.
 * Core API routes must keep working when these variables are unset.
 */
export function loadStripeWebhookConfig(
  env: NodeJS.ProcessEnv = process.env,
): StripeWebhookConfig {
  const missing: string[] = [];

  const secretKey = requireNonEmpty(env, "STRIPE_SECRET_KEY", missing);
  const webhookSecret = requireNonEmpty(env, "STRIPE_WEBHOOK_SECRET", missing);

  if (missing.length > 0) {
    throw new AppError(
      503,
      "STRIPE_WEBHOOK_CONFIGURATION",
      `Stripe webhook is not configured. Missing: ${missing.join(", ")}.`,
    );
  }

  return {
    secretKey: secretKey!,
    webhookSecret: webhookSecret!,
  };
}
