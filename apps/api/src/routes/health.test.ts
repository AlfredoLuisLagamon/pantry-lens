import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../app";

describe("GET /api/health", () => {
  it("returns ok status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "pantry-lens-api",
    });
  });
});

describe("unknown routes", () => {
  it("returns normalized 404 error", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });
});
