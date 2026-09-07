import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./demoUser", () => ({
  getDemoUser: vi.fn(),
}));

import { AppError } from "../errors/AppError";
import type { OffClient } from "../integrations/openFoodFacts/client";
import { getDemoUser } from "./demoUser";
import { getProductDetail, searchProducts } from "./products";

const getDemoUserMock = getDemoUser as ReturnType<typeof vi.fn>;

const richNutriments = {
  "energy-kcal_100g": 999,
  fat_100g: 30.9,
  "saturated-fat_100g": 10.6,
  carbohydrates_100g: 57.5,
  sugars_100g: 56.3,
  fiber_100g: 1.2,
  proteins_100g: 123,
  salt_100g: 0.107,
};

function mockClientWithNutrition(
  nutriments: Record<string, unknown> | null = richNutriments,
): OffClient {
  return {
    searchProducts: async () => ({
      count: 1,
      page: 1,
      pageSize: 12,
      products: [
        {
          code: "3017620422003",
          product_name: "Nutella",
          brands: "Ferrero",
          nutriments: richNutriments,
        },
      ],
    }),
    getProductByBarcode: async () => ({
      code: "3017620422003",
      product_name_en: "Nutella",
      brands: "Ferrero",
      nutriments,
    }),
  };
}

describe("products service HTTP mapping", () => {
  beforeEach(() => {
    getDemoUserMock.mockReset();
  });

  it("search responses never include nutrition fields and do not load entitlement", async () => {
    const result = await searchProducts(
      "nutella",
      "en",
      1,
      mockClientWithNutrition(),
    );

    expect(getDemoUserMock).not.toHaveBeenCalled();
    expect(result.products[0]).not.toHaveProperty("nutrition");
    expect(result.products[0]).not.toHaveProperty("nutritionAccess");
    expect(result.products[0]?.name).toBe("Nutella");
  });

  it("denies nutrition for free users via direct API mapping", async () => {
    getDemoUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: null,
      hasNutritionAccess: false,
    });

    const result = await getProductDetail(
      "3017620422003",
      "en",
      mockClientWithNutrition(),
    );

    expect(result).toEqual({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: null,
      languageUsed: "en",
      nutrition: null,
      nutritionAccess: "locked",
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("999");
    expect(serialized).not.toContain("123");
    expect(serialized).not.toContain("energyKcal");
    expect(serialized).not.toContain("nutriments");
  });

  it("grants nutrition for active subscriptions", async () => {
    getDemoUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: {
        status: "active",
        currentPeriodEnd: "2026-10-05T00:00:00.000Z",
        cancelAtPeriodEnd: false,
      },
      hasNutritionAccess: true,
    });

    const result = await getProductDetail(
      "3017620422003",
      "en",
      mockClientWithNutrition(),
    );

    expect(result.nutritionAccess).toBe("granted");
    expect(result.nutrition?.per100g.energyKcal).toBe(999);
    expect(result.nutrition?.per100g.proteins).toBe(123);
  });

  it("grants nutrition for trialing subscriptions", async () => {
    getDemoUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: {
        status: "trialing",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      hasNutritionAccess: true,
    });

    const result = await getProductDetail(
      "3017620422003",
      "en",
      mockClientWithNutrition(),
    );

    expect(result.nutritionAccess).toBe("granted");
    expect(result.nutrition?.per100g.energyKcal).toBe(999);
  });

  it("grants nutrition when active and cancelAtPeriodEnd is true", async () => {
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

    const result = await getProductDetail(
      "3017620422003",
      "en",
      mockClientWithNutrition(),
    );

    expect(result.nutritionAccess).toBe("granted");
    expect(result.nutrition).not.toBeNull();
  });

  it.each(["past_due", "canceled", "unexpected"] as const)(
    "locks nutrition for status %s",
    async (status) => {
      getDemoUserMock.mockResolvedValue({
        id: "user_1",
        email: "demo@pantry-lens.local",
        displayName: "Demo User",
        subscription: {
          status,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        hasNutritionAccess: false,
      });

      const result = await getProductDetail(
        "3017620422003",
        "en",
        mockClientWithNutrition(),
      );

      expect(result.nutritionAccess).toBe("locked");
      expect(result.nutrition).toBeNull();
      expect(JSON.stringify(result)).not.toContain("999");
    },
  );

  it("returns empty nutrition shell when entitled but OFF has no nutriments", async () => {
    getDemoUserMock.mockResolvedValue({
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

    const result = await getProductDetail(
      "3017620422003",
      "en",
      mockClientWithNutrition(null),
    );

    expect(result).toEqual({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: null,
      languageUsed: "en",
      nutritionAccess: "granted",
      nutrition: {
        per100g: {
          energyKcal: null,
          fat: null,
          saturatedFat: null,
          carbohydrates: null,
          sugars: null,
          fiber: null,
          proteins: null,
          salt: null,
        },
      },
    });
  });

  it("fails closed on DB unavailable before calling OFF", async () => {
    getDemoUserMock.mockRejectedValue(
      new AppError(
        503,
        "DATABASE_UNAVAILABLE",
        "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
      ),
    );

    const getProductByBarcode = vi.fn();
    const client: OffClient = {
      searchProducts: async () => ({
        count: 0,
        page: 1,
        pageSize: 12,
        products: [],
      }),
      getProductByBarcode,
    };

    await expect(getProductDetail("3017620422003", "en", client)).rejects.toMatchObject({
      statusCode: 503,
      code: "DATABASE_UNAVAILABLE",
    });
    expect(getProductByBarcode).not.toHaveBeenCalled();
  });

  it("preserves PRODUCT_NOT_FOUND after a successful entitlement lookup", async () => {
    getDemoUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: null,
      hasNutritionAccess: false,
    });

    const client: OffClient = {
      searchProducts: async () => ({
        count: 0,
        page: 1,
        pageSize: 12,
        products: [],
      }),
      getProductByBarcode: async () => ({
        // Missing barcode → normalizeProduct returns null
        product_name: "Ghost",
      }),
    };

    await expect(getProductDetail("000", "en", client)).rejects.toMatchObject({
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  });
});
