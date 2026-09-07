import { apiFetch } from "./client";

export type SubscriptionSummary = {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type UserResponse = {
  id: string;
  email: string;
  displayName: string;
  subscription: SubscriptionSummary | null;
  hasNutritionAccess: boolean;
};

export async function getUser(signal?: AbortSignal): Promise<UserResponse> {
  return apiFetch<UserResponse>("/api/user", { signal });
}
