import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./demoUser", () => ({
  getDemoUser: vi.fn(),
}));

vi.mock("../db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    recentSearch: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "../db/prisma";
import { getDemoUser } from "./demoUser";
import {
  listRecentSearches,
  recordRecentSearch,
  RECENT_SEARCH_LIMIT,
} from "./recentSearches";

const getDemoUserMock = getDemoUser as ReturnType<typeof vi.fn>;
const transactionMock = prisma.$transaction as ReturnType<typeof vi.fn>;
const findManyMock = prisma.recentSearch.findMany as ReturnType<typeof vi.fn>;

describe("recentSearches service", () => {
  beforeEach(() => {
    getDemoUserMock.mockReset();
    transactionMock.mockReset();
    findManyMock.mockReset();
    getDemoUserMock.mockResolvedValue({
      id: "user_demo",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: null,
      hasNutritionAccess: false,
    });
  });

  it("lists newest searches first as DTOs", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "1",
        queryDisplay: "Nutella",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        id: "2",
        queryDisplay: "Oreo",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);

    await expect(listRecentSearches()).resolves.toEqual([
      {
        id: "1",
        query: "Nutella",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "2",
        query: "Oreo",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user_demo" },
      orderBy: { updatedAt: "desc" },
      take: RECENT_SEARCH_LIMIT,
    });
  });

  it("upserts by queryKey and deletes overflow beyond 10", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "search_1",
      queryDisplay: "Oreo",
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    });
    const findMany = vi.fn().mockResolvedValue([{ id: "old_1" }, { id: "old_2" }]);
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 });

    transactionMock.mockImplementation(async (callback) =>
      callback({
        recentSearch: {
          upsert,
          findMany,
          deleteMany,
        },
      }),
    );

    await expect(recordRecentSearch(" Oreo ")).resolves.toEqual({
      id: "search_1",
      query: "Oreo",
      updatedAt: "2026-01-03T00:00:00.000Z",
    });

    expect(upsert).toHaveBeenCalledWith({
      where: {
        userId_queryKey: {
          userId: "user_demo",
          queryKey: "oreo",
        },
      },
      create: {
        userId: "user_demo",
        queryKey: "oreo",
        queryDisplay: "Oreo",
      },
      update: {
        queryDisplay: "Oreo",
      },
    });

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user_demo" },
      orderBy: { updatedAt: "desc" },
      skip: RECENT_SEARCH_LIMIT,
      select: { id: true },
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["old_1", "old_2"] } },
    });
  });
});
