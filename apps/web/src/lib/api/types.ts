export type ProductSummary = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  languageUsed: string | null;
};

export type ProductSearchResponse = {
  query: string;
  page: number;
  pageSize: number;
  total: number | null;
  products: ProductSummary[];
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

export type ProductDetail = {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  languageUsed: string | null;
  nutrition: {
    per100g: NutritionPer100g;
  } | null;
  nutritionAccess: "locked" | "granted";
};

export type RecentSearch = {
  id: string;
  query: string;
  updatedAt: string;
};

export type RecentSearchesResponse = {
  searches: RecentSearch[];
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
