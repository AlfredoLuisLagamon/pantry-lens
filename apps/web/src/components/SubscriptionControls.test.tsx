import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { SubscriptionControls } from "@/components/SubscriptionControls";
import { ApiError } from "@/lib/api/types";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api/user", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/api/billing", () => ({
  createCheckoutSession: vi.fn(),
}));

import { getUser } from "@/lib/api/user";

const getUserMock = getUser as ReturnType<typeof vi.fn>;

describe("SubscriptionControls", () => {
  beforeEach(() => {
    getUserMock.mockReset();
  });

  it("shows Subscribe for free users", async () => {
    getUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: null,
      hasNutritionAccess: false,
    });

    renderWithProviders(<SubscriptionControls />, { withBilling: true });

    expect(
      await screen.findByRole("button", { name: "Subscribe" }),
    ).toBeInTheDocument();
  });

  it("shows Subscribed and hides Subscribe for entitled users", async () => {
    getUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: {
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      hasNutritionAccess: true,
    });

    renderWithProviders(<SubscriptionControls />, { withBilling: true });

    expect(await screen.findByText("Subscribed")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Subscribe" }),
    ).not.toBeInTheDocument();
  });

  it("hides Subscribe when user status cannot be determined", async () => {
    getUserMock.mockRejectedValue(
      new ApiError(503, "DATABASE_UNAVAILABLE", "db down"),
    );

    renderWithProviders(<SubscriptionControls />, { withBilling: true });

    expect(
      await screen.findByText("Subscription status unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Subscribe" }),
    ).not.toBeInTheDocument();
  });
});
