import { describe, expect, it } from "vitest";

import { AppError } from "../errors/AppError";
import { normalizeSearchQuery } from "./normalizeSearchQuery";

describe("normalizeSearchQuery", () => {
  it("normalizes casing and whitespace for the uniqueness key", () => {
    expect(normalizeSearchQuery("Oreo")).toEqual({
      queryDisplay: "Oreo",
      queryKey: "oreo",
    });
    expect(normalizeSearchQuery(" OREO ")).toEqual({
      queryDisplay: "OREO",
      queryKey: "oreo",
    });
    expect(normalizeSearchQuery("oreo")).toEqual({
      queryDisplay: "oreo",
      queryKey: "oreo",
    });
  });

  it("collapses repeated whitespace in display and key", () => {
    expect(normalizeSearchQuery("  Coca   Cola ")).toEqual({
      queryDisplay: "Coca Cola",
      queryKey: "coca cola",
    });
  });

  it("rejects empty and too-short queries", () => {
    expect(() => normalizeSearchQuery("   ")).toThrow(AppError);
    expect(() => normalizeSearchQuery("a")).toThrow(/at least 2 characters/);
  });

  it("rejects non-string input", () => {
    expect(() => normalizeSearchQuery(undefined)).toThrow(/required/);
  });
});
