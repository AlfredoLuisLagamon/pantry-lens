import { AppError } from "../../errors/AppError";

export type OpenFoodFactsConfig = {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  pageSize: number;
};

const PRODUCT_FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "product_name_nl",
  "product_name_de",
  "product_name_fr",
  "generic_name",
  "generic_name_en",
  "generic_name_nl",
  "generic_name_de",
  "generic_name_fr",
  "brands",
  "image_front_url",
  "image_url",
  "nutriments",
].join(",");

export function getOpenFoodFactsConfig(
  env: NodeJS.ProcessEnv = process.env,
): OpenFoodFactsConfig {
  const baseUrl = (
    env.OPEN_FOOD_FACTS_BASE_URL?.trim() || "https://world.openfoodfacts.org"
  ).replace(/\/$/, "");

  const userAgent = env.OPEN_FOOD_FACTS_USER_AGENT?.trim();
  if (!userAgent) {
    throw new AppError(
      500,
      "CONFIG_ERROR",
      "OPEN_FOOD_FACTS_USER_AGENT is not configured.",
    );
  }

  return {
    baseUrl,
    userAgent,
    timeoutMs: 8000,
    pageSize: 12,
  };
}

type FetchFn = (
  input: URL | string,
  init?: RequestInit,
) => Promise<Response>;

async function fetchOffJson<T>(
  url: URL,
  config: OpenFoodFactsConfig,
  fetchFn: FetchFn,
): Promise<{ status: number; body: T }> {
  let response: Response;

  try {
    response = await fetchFn(url, {
      method: "GET",
      headers: {
        "User-Agent": config.userAgent,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new AppError(
        504,
        "OFF_TIMEOUT",
        "Open Food Facts request timed out.",
      );
    }

    throw new AppError(
      502,
      "OFF_UPSTREAM",
      "Open Food Facts is currently unavailable.",
    );
  }

  let body: T;
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (response.status < 200 || response.status >= 300) {
      // OFF sometimes returns HTML for rate-limit / overload pages.
      return { status: response.status, body: {} as T };
    }

    throw new AppError(
      502,
      "OFF_UPSTREAM",
      "Open Food Facts returned an invalid response.",
    );
  }

  try {
    body = (await response.json()) as T;
  } catch {
    throw new AppError(
      502,
      "OFF_UPSTREAM",
      "Open Food Facts returned an invalid response.",
    );
  }

  return { status: response.status, body };
}

export type OffClient = {
  searchProducts: (
    query: string,
    page: number,
  ) => Promise<{
    count: number | null;
    page: number;
    pageSize: number;
    products: import("./types").OffRawProduct[];
  }>;
  getProductByBarcode: (
    barcode: string,
  ) => Promise<import("./types").OffRawProduct>;
};

export function createOpenFoodFactsClient(
  config: OpenFoodFactsConfig = getOpenFoodFactsConfig(),
  fetchFn: FetchFn = fetch,
): OffClient {
  return {
    async searchProducts(query, page) {
      const url = new URL("/cgi/search.pl", config.baseUrl);
      url.searchParams.set("search_terms", query);
      url.searchParams.set("search_simple", "1");
      url.searchParams.set("action", "process");
      url.searchParams.set("json", "1");
      url.searchParams.set("page", String(page));
      url.searchParams.set("page_size", String(config.pageSize));
      url.searchParams.set("fields", PRODUCT_FIELDS);

      const { status, body } = await fetchOffJson<
        import("./types").OffSearchResponse
      >(url, config, fetchFn);

      if (status < 200 || status >= 300) {
        throw new AppError(
          502,
          "OFF_UPSTREAM",
          "Open Food Facts search failed.",
        );
      }

      const products = Array.isArray(body.products) ? body.products : [];
      const count =
        typeof body.count === "number" && Number.isFinite(body.count)
          ? body.count
          : null;

      return {
        count,
        page,
        pageSize: config.pageSize,
        products,
      };
    },

    async getProductByBarcode(barcode) {
      const url = new URL(
        `/api/v3/product/${encodeURIComponent(barcode)}`,
        config.baseUrl,
      );
      url.searchParams.set("fields", PRODUCT_FIELDS);

      const { status, body } = await fetchOffJson<
        import("./types").OffV3ProductResponse
      >(url, config, fetchFn);

      if (status === 404) {
        throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
      }

      if (status < 200 || status >= 300) {
        throw new AppError(
          502,
          "OFF_UPSTREAM",
          "Open Food Facts product lookup failed.",
        );
      }

      if (body.status !== "success" || !body.product) {
        throw new AppError(404, "PRODUCT_NOT_FOUND", "Product not found.");
      }

      return body.product;
    },
  };
}
