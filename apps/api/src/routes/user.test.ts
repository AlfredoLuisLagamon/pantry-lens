import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/demoUser", () => ({
  getDemoUser: vi.fn(),
}));

import { app } from "../app";
import { AppError } from "../errors/AppError";
import { getDemoUser } from "../services/demoUser";

const getDemoUserMock = getDemoUser as ReturnType<typeof vi.fn>;

describe("GET /api/user", () => {
  beforeEach(() => {
    getDemoUserMock.mockReset();
  });

  it("returns the public user payload with entitlement", async () => {
    getDemoUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: {
        status: "active",
        currentPeriodEnd: "2026-10-05T00:00:00.000Z",
        cancelAtPeriodEnd: true,
      },
      hasNutritionAccess: true,
    });

    const response = await request(app).get("/api/user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: {
        status: "active",
        currentPeriodEnd: "2026-10-05T00:00:00.000Z",
        cancelAtPeriodEnd: true,
      },
      hasNutritionAccess: true,
    });
    expect(response.body).not.toHaveProperty("stripeCustomerId");
    expect(response.body.subscription).not.toHaveProperty(
      "stripeSubscriptionId",
    );
  });

  it("returns null subscription when the demo user is free", async () => {
    getDemoUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: null,
      hasNutritionAccess: false,
    });

    const response = await request(app).get("/api/user");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: null,
      hasNutritionAccess: false,
    });
  });

  it("returns normalized 503 when the database is unavailable", async () => {
    getDemoUserMock.mockRejectedValue(
      new AppError(
        503,
        "DATABASE_UNAVAILABLE",
        "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
      ),
    );

    const response = await request(app).get("/api/user");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message:
          "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
      },
    });
  });
});
