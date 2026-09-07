import { prisma } from "../db/prisma";
import { AppError } from "../errors/AppError";
import { normalizeSearchQuery } from "../lib/normalizeSearchQuery";
import { getDemoUser } from "./demoUser";

export const RECENT_SEARCH_LIMIT = 10;

export type RecentSearchDto = {
  id: string;
  query: string;
  updatedAt: string;
};

function toDto(row: {
  id: string;
  queryDisplay: string;
  updatedAt: Date;
}): RecentSearchDto {
  return {
    id: row.id,
    query: row.queryDisplay,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function asDatabaseUnavailable(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  throw new AppError(
    503,
    "DATABASE_UNAVAILABLE",
    "Database is unavailable. Start MySQL and apply migrations before using this endpoint.",
  );
}

export async function listRecentSearches(): Promise<RecentSearchDto[]> {
  const user = await getDemoUser();

  try {
    const rows = await prisma.recentSearch.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: RECENT_SEARCH_LIMIT,
    });

    return rows.map(toDto);
  } catch (error) {
    asDatabaseUnavailable(error);
  }
}

export async function recordRecentSearch(
  rawQuery: unknown,
): Promise<RecentSearchDto> {
  const user = await getDemoUser();
  const { queryKey, queryDisplay } = normalizeSearchQuery(rawQuery);

  try {
    const upserted = await prisma.$transaction(async (tx) => {
      const row = await tx.recentSearch.upsert({
        where: {
          userId_queryKey: {
            userId: user.id,
            queryKey,
          },
        },
        create: {
          userId: user.id,
          queryKey,
          queryDisplay,
        },
        update: {
          queryDisplay,
        },
      });

      const overflow = await tx.recentSearch.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        skip: RECENT_SEARCH_LIMIT,
        select: { id: true },
      });

      if (overflow.length > 0) {
        await tx.recentSearch.deleteMany({
          where: {
            id: { in: overflow.map((item) => item.id) },
          },
        });
      }

      return row;
    });

    return toDto(upserted);
  } catch (error) {
    asDatabaseUnavailable(error);
  }
}
