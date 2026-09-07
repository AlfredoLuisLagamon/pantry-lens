import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../errors/AppError";
import { createOpenFoodFactsClient } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: async () => body,
  } as Response;
}

describe("Open Food Facts client errors", () => {
  const config = {
    baseUrl: "https://world.openfoodfacts.org",
    userAgent: "PantryLens/1.0 (test)",
    timeoutMs: 8000,
    pageSize: 12,
  };

  it("maps timeout to OFF_TIMEOUT", async () => {
    const timeout = Object.assign(new Error("aborted"), {
      name: "TimeoutError",
    });
    const fetchFn = vi.fn().mockRejectedValue(timeout);
    const client = createOpenFoodFactsClient(config, fetchFn);

    await expect(client.searchProducts("oreo", 1)).rejects.toMatchObject({
      statusCode: 504,
      code: "OFF_TIMEOUT",
    } satisfies Partial<AppError>);
  });

  it("maps non-2xx search responses to OFF_UPSTREAM", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(429, { error: "rate limited" }));
    const client = createOpenFoodFactsClient(config, fetchFn);

    await expect(client.searchProducts("oreo", 1)).rejects.toMatchObject({
      statusCode: 502,
      code: "OFF_UPSTREAM",
    } satisfies Partial<AppError>);
  });

  it("maps non-JSON overload pages to OFF_UPSTREAM", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 503,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "text/html" : null,
      },
      json: async () => {
        throw new Error("unexpected json parse");
      },
    } as unknown as Response);
    const client = createOpenFoodFactsClient(config, fetchFn);

    await expect(client.searchProducts("oreo", 1)).rejects.toMatchObject({
      statusCode: 502,
      code: "OFF_UPSTREAM",
    } satisfies Partial<AppError>);
  });

  it("maps HTTP 404 product lookup to PRODUCT_NOT_FOUND", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(jsonResponse(404, { status: "failure" }));
    const client = createOpenFoodFactsClient(config, fetchFn);

    await expect(client.getProductByBarcode("00000000")).rejects.toMatchObject({
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
    } satisfies Partial<AppError>);
  });
});
