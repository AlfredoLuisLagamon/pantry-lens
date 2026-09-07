import type {
  NutritionPer100g,
  ProductDetailResponse,
  ProductSearchResponse,
  SupportedLanguage,
} from "../integrations/openFoodFacts/types";
import {
  createOpenFoodFactsClient,
  type OffClient,
} from "../integrations/openFoodFacts/client";
import {
  normalizeProduct,
  toProductSummary,
} from "../integrations/openFoodFacts/normalizeProduct";
import { AppError } from "../errors/AppError";
import { getDemoUser } from "./demoUser";

let defaultClient: OffClient | null = null;

/** Empty nutrition shell — used when entitled but OFF has no nutriments. */
export const EMPTY_NUTRITION_PER_100G: NutritionPer100g = {
  energyKcal: null,
  fat: null,
  saturatedFat: null,
  carbohydrates: null,
  sugars: null,
  fiber: null,
  proteins: null,
  salt: null,
};

function getDefaultClient(): OffClient {
  if (!defaultClient) {
    defaultClient = createOpenFoodFactsClient();
  }
  return defaultClient;
}

export async function searchProducts(
  query: string,
  lang: SupportedLanguage,
  page: number,
  client: OffClient = getDefaultClient(),
): Promise<ProductSearchResponse> {
  const result = await client.searchProducts(query, page);

  const products = result.products
    .map((raw) => normalizeProduct(raw, lang))
    .filter((product): product is NonNullable<typeof product> => product !== null)
    .map(toProductSummary);

  return {
    query,
    page: result.page,
    pageSize: result.pageSize,
    total: result.count,
    products,
  };
}

/**
 * Product detail authorization:
 * 1. Resolve demo-user entitlement from DB (fail closed on DB errors)
 * 2. Fetch/normalize OFF product
 * 3. Allowlist response fields; include nutrition only when entitled
 */
export async function getProductDetail(
  barcode: string,
  lang: SupportedLanguage,
  client: OffClient = getDefaultClient(),
): Promise<ProductDetailResponse> {
  // Load entitlement first so a DB outage does not consume an OFF request.
  const demoUser = await getDemoUser();
  const entitled = demoUser.hasNutritionAccess;

  const raw = await client.getProductByBarcode(barcode);
  const normalized = normalizeProduct(raw, lang);

  if (!normalized) {
    throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }

  return {
    barcode: normalized.barcode,
    name: normalized.name,
    brand: normalized.brand,
    imageUrl: normalized.imageUrl,
    languageUsed: normalized.languageUsed,
    nutrition: entitled
      ? (normalized.nutrition ?? { per100g: { ...EMPTY_NUTRITION_PER_100G } })
      : null,
    nutritionAccess: entitled ? "granted" : "locked",
  };
}
