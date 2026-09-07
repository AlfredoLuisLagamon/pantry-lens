import { describe, expect, it } from "vitest";

import { translateErrorCode } from "./index";

describe("translateErrorCode", () => {
  it("maps known codes to localized messages", () => {
    expect(translateErrorCode("en", "OFF_UPSTREAM")).toBe(
      "Product search is temporarily unavailable. Try again.",
    );
    expect(translateErrorCode("fr", "PRODUCT_NOT_FOUND")).toBe(
      "Produit introuvable.",
    );
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(translateErrorCode("en", "SOMETHING_WEIRD")).toBe(
      "Something went wrong. Try again.",
    );
  });
});
