import type {
  LanguageUsed,
  NormalizedProduct,
  NutritionPer100g,
  OffRawProduct,
  ProductSummary,
  SupportedLanguage,
} from "./types";

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function resolveProductName(
  product: OffRawProduct,
  lang: SupportedLanguage,
): { name: string | null; languageUsed: LanguageUsed | null } {
  const localized = asTrimmedString(
    product[`product_name_${lang}` as keyof OffRawProduct],
  );
  if (localized) {
    return { name: localized, languageUsed: lang };
  }

  const english = asTrimmedString(product.product_name_en);
  if (english) {
    return { name: english, languageUsed: "en" };
  }

  const main = asTrimmedString(product.product_name);
  if (main) {
    return { name: main, languageUsed: "generic" };
  }

  const genericLocalized = asTrimmedString(
    product[`generic_name_${lang}` as keyof OffRawProduct],
  );
  if (genericLocalized) {
    return { name: genericLocalized, languageUsed: lang };
  }

  const genericEnglish = asTrimmedString(product.generic_name_en);
  if (genericEnglish) {
    return { name: genericEnglish, languageUsed: "en" };
  }

  const generic = asTrimmedString(product.generic_name);
  if (generic) {
    return { name: generic, languageUsed: "generic" };
  }

  return { name: null, languageUsed: null };
}

export function normalizeNutrition(
  nutriments: Record<string, unknown> | null | undefined,
): { per100g: NutritionPer100g } | null {
  if (!nutriments || typeof nutriments !== "object") {
    return null;
  }

  let energyKcal = asFiniteNumber(nutriments["energy-kcal_100g"]);
  if (energyKcal === null) {
    const energyKj = asFiniteNumber(nutriments["energy-kj_100g"]);
    if (energyKj !== null) {
      energyKcal = Math.round((energyKj / 4.184) * 10) / 10;
    }
  }

  return {
    per100g: {
      energyKcal,
      fat: asFiniteNumber(nutriments.fat_100g),
      saturatedFat: asFiniteNumber(nutriments["saturated-fat_100g"]),
      carbohydrates: asFiniteNumber(nutriments.carbohydrates_100g),
      sugars: asFiniteNumber(nutriments.sugars_100g),
      fiber: asFiniteNumber(nutriments.fiber_100g),
      proteins: asFiniteNumber(nutriments.proteins_100g),
      salt: asFiniteNumber(nutriments.salt_100g),
    },
  };
}

export function normalizeBarcode(raw: OffRawProduct): string | null {
  if (raw.code === undefined || raw.code === null) {
    return null;
  }
  const code = String(raw.code).trim();
  return code.length > 0 ? code : null;
}

export function normalizeProduct(
  raw: OffRawProduct,
  lang: SupportedLanguage,
): NormalizedProduct | null {
  const barcode = normalizeBarcode(raw);
  if (!barcode) {
    return null;
  }

  const { name, languageUsed } = resolveProductName(raw, lang);

  return {
    barcode,
    name,
    brand: asTrimmedString(raw.brands),
    imageUrl:
      asTrimmedString(raw.image_front_url) ?? asTrimmedString(raw.image_url),
    languageUsed,
    nutrition: normalizeNutrition(raw.nutriments ?? null),
  };
}

export function toProductSummary(product: NormalizedProduct): ProductSummary {
  return {
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    languageUsed: product.languageUsed,
  };
}
