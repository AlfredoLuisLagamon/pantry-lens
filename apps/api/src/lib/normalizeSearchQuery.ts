import { AppError } from "../errors/AppError";

export type NormalizedSearchQuery = {
  queryKey: string;
  queryDisplay: string;
};

/**
 * Canonicalize a search query for RecentSearch uniqueness + display.
 * - trim
 * - collapse internal whitespace
 * - lowercase for queryKey
 * - keep collapsed casing for queryDisplay
 */
export function normalizeSearchQuery(raw: unknown): NormalizedSearchQuery {
  if (typeof raw !== "string") {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Field 'query' is required and must be a string.",
    );
  }

  const queryDisplay = raw.trim().replace(/\s+/g, " ");

  if (queryDisplay.length < 2) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Query must be at least 2 characters.",
    );
  }

  if (queryDisplay.length > 100) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Query must be at most 100 characters.",
    );
  }

  return {
    queryDisplay,
    queryKey: queryDisplay.toLowerCase(),
  };
}
