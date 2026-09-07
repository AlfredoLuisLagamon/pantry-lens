import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/recentSearches", () => ({
  listRecentSearches: vi.fn(),
  recordRecentSearch: vi.fn(),
}));

import { app } from "../app";
import { AppError } from "../errors/AppError";
import {
  listRecentSearches,
  recordRecentSearch,
} from "../services/recentSearches";

const listRecentSearchesMock = listRecentSearches as ReturnType<typeof vi.fn>;
const recordRecentSearchMock = recordRecentSearch as ReturnType<typeof vi.fn>;

describe("GET /api/searches/recent", () => {
  beforeEach(() => {
    listRecentSearchesMock.mockReset();
    recordRecentSearchMock.mockReset();
  });

  it("returns newest-first DTO list", async () => {
    listRecentSearchesMock.mockResolvedValue([
      {
        id: "1",
        query: "Nutella",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ]);

    const response = await request(app).get("/api/searches/recent");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      searches: [
        {
          id: "1",
          query: "Nutella",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
    });
  });
});

describe("POST /api/searches/recent", () => {
  beforeEach(() => {
    listRecentSearchesMock.mockReset();
    recordRecentSearchMock.mockReset();
  });

  it("records a valid query", async () => {
    recordRecentSearchMock.mockResolvedValue({
      id: "1",
      query: "Oreo",
      updatedAt: "2026-01-03T00:00:00.000Z",
    });

    const response = await request(app)
      .post("/api/searches/recent")
      .send({ query: "Oreo" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      search: {
        id: "1",
        query: "Oreo",
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
    });
    expect(recordRecentSearchMock).toHaveBeenCalledWith("Oreo");
  });

  it("returns 400 for empty query", async () => {
    recordRecentSearchMock.mockRejectedValue(
      new AppError(400, "VALIDATION_ERROR", "Query must be at least 2 characters."),
    );

    const response = await request(app)
      .post("/api/searches/recent")
      .send({ query: " " });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns centralized DB error", async () => {
    recordRecentSearchMock.mockRejectedValue(
      new AppError(
        503,
        "DATABASE_UNAVAILABLE",
        "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
      ),
    );

    const response = await request(app)
      .post("/api/searches/recent")
      .send({ query: "Oreo" });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("DATABASE_UNAVAILABLE");
  });
});
