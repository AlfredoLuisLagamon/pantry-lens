import { apiFetch } from "./client";
import type { ProductDetail, ProductSearchResponse } from "./types";
import type { SupportedLanguage } from "@/lib/i18n/types";

export async function searchProducts(options: {
  query: string;
  page?: number;
  language: SupportedLanguage;
  signal?: AbortSignal;
}): Promise<ProductSearchResponse> {
  const params = new URLSearchParams({
    q: options.query,
    lang: options.language,
    page: String(options.page ?? 1),
  });

  return apiFetch<ProductSearchResponse>(`/api/products/search?${params}`, {
    signal: options.signal,
  });
}

export async function getProductByBarcode(options: {
  barcode: string;
  language: SupportedLanguage;
  signal?: AbortSignal;
}): Promise<ProductDetail> {
  const params = new URLSearchParams({ lang: options.language });
  return apiFetch<ProductDetail>(
    `/api/products/${encodeURIComponent(options.barcode)}?${params}`,
    { signal: options.signal },
  );
}

export function isUpstreamSearchError(code: string): boolean {
  return code === "OFF_UPSTREAM" || code === "OFF_TIMEOUT";
}
