import { describe, expect, it } from "vitest";

import {
  normalizeNutrition,
  normalizeProduct,
  resolveProductName,
} from "./normalizeProduct";
import type { OffRawProduct } from "./types";

describe("resolveProductName", () => {
  it("uses requested language when available", () => {
    expect(
      resolveProductName(
        {
          product_name_fr: "Nutella FR",
          product_name_en: "Nutella EN",
          product_name: "Nutella",
        },
        "fr",
      ),
    ).toEqual({ name: "Nutella FR", languageUsed: "fr" });
  });

  it("falls back to English when requested language is missing", () => {
    expect(
      resolveProductName(
        {
          product_name_en: "Nutella EN",
          product_name: "Nutella",
        },
        "nl",
      ),
    ).toEqual({ name: "Nutella EN", languageUsed: "en" });
  });

  it("falls back to generic product_name when English is missing", () => {
    expect(
      resolveProductName(
        {
          product_name: "Nutella Main",
        },
        "de",
      ),
    ).toEqual({ name: "Nutella Main", languageUsed: "generic" });
  });

  it("uses generic_name chain and returns null when all names are missing", () => {
    expect(
      resolveProductName(
        {
          generic_name_fr: "Pâte à tartiner",
        },
        "fr",
      ),
    ).toEqual({ name: "Pâte à tartiner", languageUsed: "fr" });

    expect(resolveProductName({}, "en")).toEqual({
      name: null,
      languageUsed: null,
    });
  });

  it("treats blank strings as missing", () => {
    expect(
      resolveProductName(
        {
          product_name_fr: "   ",
          product_name_en: "",
          product_name: "Fallback",
        },
        "fr",
      ),
    ).toEqual({ name: "Fallback", languageUsed: "generic" });
  });
});

describe("normalizeProduct incomplete data", () => {
  it("keeps products with missing brand and image", () => {
    const product = normalizeProduct(
      {
        code: "3017620422003",
        product_name: "Mystery Snack",
      },
      "en",
    );

    expect(product).toEqual({
      barcode: "3017620422003",
      name: "Mystery Snack",
      brand: null,
      imageUrl: null,
      languageUsed: "generic",
      nutrition: null,
    });
  });

  it("returns null when barcode is missing", () => {
    expect(
      normalizeProduct(
        {
          product_name: "No Code",
        },
        "en",
      ),
    ).toBeNull();
  });

  it("prefers image_front_url over image_url", () => {
    const product = normalizeProduct(
      {
        code: "12345678",
        image_front_url: "https://example.com/front.jpg",
        image_url: "https://example.com/other.jpg",
      },
      "en",
    );

    expect(product?.imageUrl).toBe("https://example.com/front.jpg");
  });
});

describe("normalizeNutrition", () => {
  it("preserves valid zero values", () => {
    expect(
      normalizeNutrition({
        "energy-kcal_100g": 0,
        fat_100g: 0,
        "saturated-fat_100g": 0,
        carbohydrates_100g: 0,
        sugars_100g: 0,
        fiber_100g: 0,
        proteins_100g: 0,
        salt_100g: 0,
      }),
    ).toEqual({
      per100g: {
        energyKcal: 0,
        fat: 0,
        saturatedFat: 0,
        carbohydrates: 0,
        sugars: 0,
        fiber: 0,
        proteins: 0,
        salt: 0,
      },
    });
  });

  it("maps missing nutrients to null", () => {
    expect(normalizeNutrition({})).toEqual({
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
    });
  });

  it("maps energy-kcal_100g when present", () => {
    expect(
      normalizeNutrition({
        "energy-kcal_100g": 539,
      })?.per100g.energyKcal,
    ).toBe(539);
  });

  it("converts energy-kj_100g when kcal is absent", () => {
    expect(
      normalizeNutrition({
        "energy-kj_100g": 4184,
      })?.per100g.energyKcal,
    ).toBe(1000);
  });

  it("returns null nutrition when nutriments are absent", () => {
    const raw: OffRawProduct = { code: "12345678", product_name: "X" };
    expect(normalizeProduct(raw, "en")?.nutrition).toBeNull();
  });
});
