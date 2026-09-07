import { apiFetch } from "./client";
import type { RecentSearch, RecentSearchesResponse } from "./types";

export async function getRecentSearches(): Promise<RecentSearch[]> {
  const response = await apiFetch<RecentSearchesResponse>("/api/searches/recent");
  return response.searches;
}

export async function recordRecentSearch(query: string): Promise<RecentSearch> {
  const response = await apiFetch<{ search: RecentSearch }>("/api/searches/recent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return response.search;
}
