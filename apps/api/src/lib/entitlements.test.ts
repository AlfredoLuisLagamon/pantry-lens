import { describe, expect, it } from "vitest";

import { hasNutritionAccess } from "./entitlements";

describe("hasNutritionAccess", () => {
  it.each([
    ["active", true],
    ["trialing", true],
    ["past_due", false],
    ["unpaid", false],
    ["canceled", false],
    ["incomplete", false],
    ["incomplete_expired", false],
    ["paused", false],
    [null, false],
    [undefined, false],
    ["unexpected", false],
    ["future_new_status", false],
    ["", false],
  ] as const)("status %j → %s", (status, expected) => {
    expect(hasNutritionAccess(status)).toBe(expected);
  });
});
