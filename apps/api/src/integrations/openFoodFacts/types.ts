import type { SupportedLanguage } from "../../lib/language";

export type { SupportedLanguage };

export type LanguageUsed = SupportedLanguage | "generic";

/** Subset of OFF product fields we actually consume. */
export type OffRawProduct = {
  code?: string | number | null;
  product_name?: string | null;
  product_name_en?: string | null;
  product_name_nl?: string | null;
  product_name_de?: string | null;
  product_name_fr?: string | null;
  generic_name?: string | null;
  generic_name_en?: string | null;
  generic_name_nl?: string | null;
  generic_name_de?: string | null;
  generic_name_fr?: string | null;
  brands?: string | null;
  image_front_url?: string | null;
  image_url?: string | null;
  nutriments?: Record<string, unknown> | null;
};

export type OffSearchResponse = {
  count?: number;
  page?: number | string;
  page_size?: number | string;
  products?: OffRawProduct[];
};

export type OffV3ProductResponse = {
  code?: string;
  status?: string;
  product?: OffRawProduct | null;
  errors?: unknown[];
};

export type ProductSummary = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  languageUsed: LanguageUsed | null;
};

export type NutritionPer100g = {
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  proteins: number | null;
  salt: number | null;
};

export type NormalizedProduct = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  languageUsed: LanguageUsed | null;
  nutrition: {
    per100g: NutritionPer100g;
  } | null;
};

export type ProductDetailResponse = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  languageUsed: LanguageUsed | null;
  nutrition: {
    per100g: NutritionPer100g;
  } | null;
  nutritionAccess: "locked" | "granted";
};

export type ProductSearchResponse = {
  query: string;
  page: number;
  pageSize: number;
  total: number | null;
  products: ProductSummary[];
};
