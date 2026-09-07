import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/products", () => ({
  searchProducts: vi.fn(),
  getProductDetail: vi.fn(),
}));

import { app } from "../app";
import { getProductDetail, searchProducts } from "../services/products";

const searchProductsMock = searchProducts as ReturnType<typeof vi.fn>;
const getProductDetailMock = getProductDetail as ReturnType<typeof vi.fn>;

describe("GET /api/products/search", () => {
  beforeEach(() => {
    searchProductsMock.mockReset();
    getProductDetailMock.mockReset();
  });

  it("rejects missing q", async () => {
    const response = await request(app).get("/api/products/search");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects one-character q", async () => {
    const response = await request(app).get("/api/products/search?q=a");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unsupported lang", async () => {
    const response = await request(app).get(
      "/api/products/search?q=oreo&lang=es",
    );
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns normalized search results", async () => {
    searchProductsMock.mockResolvedValue({
      query: "oreo",
      page: 1,
      pageSize: 12,
      total: 2,
      products: [
        {
          barcode: "7622300336738",
          name: "Oreo",
          brand: "Oreo",
          imageUrl: "https://example.com/oreo.jpg",
          languageUsed: "en",
        },
      ],
    });

    const response = await request(app).get(
      "/api/products/search?q=oreo&lang=en",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      query: "oreo",
      page: 1,
      pageSize: 12,
      total: 2,
      products: [
        {
          barcode: "7622300336738",
          name: "Oreo",
          brand: "Oreo",
          imageUrl: "https://example.com/oreo.jpg",
          languageUsed: "en",
        },
      ],
    });
    expect(response.body.products[0]).not.toHaveProperty("nutrition");
  });
});

describe("GET /api/products/:barcode", () => {
  beforeEach(() => {
    searchProductsMock.mockReset();
    getProductDetailMock.mockReset();
  });

  it("returns locked nutrition for a valid product", async () => {
    getProductDetailMock.mockResolvedValue({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: "https://example.com/nutella.jpg",
      languageUsed: "en",
      nutrition: null,
      nutritionAccess: "locked",
    });

    const response = await request(app).get(
      "/api/products/3017620422003?lang=en",
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: "https://example.com/nutella.jpg",
      languageUsed: "en",
      nutrition: null,
      nutritionAccess: "locked",
    });
    expect(JSON.stringify(response.body)).not.toContain("999");
  });

  it("returns granted nutrition for an entitled user", async () => {
    getProductDetailMock.mockResolvedValue({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: "https://example.com/nutella.jpg",
      languageUsed: "en",
      nutritionAccess: "granted",
      nutrition: {
        per100g: {
          energyKcal: 999,
          fat: 30.9,
          saturatedFat: 10.6,
          carbohydrates: 57.5,
          sugars: 56.3,
          fiber: null,
          proteins: 123,
          salt: 0.107,
        },
      },
    });

    const response = await request(app).get(
      "/api/products/3017620422003?lang=en",
    );

    expect(response.status).toBe(200);
    expect(response.body.nutritionAccess).toBe("granted");
    expect(response.body.nutrition.per100g.energyKcal).toBe(999);
    expect(response.body.nutrition.per100g.proteins).toBe(123);
  });

  it("maps database failures to 503", async () => {
    const { AppError } = await import("../errors/AppError");
    getProductDetailMock.mockRejectedValue(
      new AppError(
        503,
        "DATABASE_UNAVAILABLE",
        "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
      ),
    );

    const response = await request(app).get(
      "/api/products/3017620422003?lang=en",
    );
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("DATABASE_UNAVAILABLE");
  });

  it("maps not found to 404", async () => {
    const { AppError } = await import("../errors/AppError");
    getProductDetailMock.mockRejectedValue(
      new AppError(404, "PRODUCT_NOT_FOUND", "Product not found."),
    );

    const response = await request(app).get("/api/products/00000000?lang=en");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("rejects invalid barcodes", async () => {
    const response = await request(app).get("/api/products/not-a-barcode");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
