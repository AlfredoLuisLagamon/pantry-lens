/**
 * Nutrition access is granted only for Stripe statuses that mean the
 * subscription is currently in good standing. Unknown or missing statuses
 * fail closed (deny access). cancelAtPeriodEnd is intentionally ignored —
 * access continues while status remains active or trialing.
 */
export function hasNutritionAccess(
  status: string | null | undefined,
): boolean {
  return status === "active" || status === "trialing";
}
