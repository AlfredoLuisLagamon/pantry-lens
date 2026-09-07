import { apiFetch } from "./client";

export type CheckoutSessionResponse = {
  url: string;
};

export async function createCheckoutSession(
  signal?: AbortSignal,
): Promise<CheckoutSessionResponse> {
  return apiFetch<CheckoutSessionResponse>("/api/billing/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
    signal,
  });
}
