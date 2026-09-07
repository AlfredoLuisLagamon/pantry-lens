import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LanguageSelector } from "@/components/LanguageSelector";
import { SearchPanel } from "@/components/SearchPanel";
import { LANGUAGE_STORAGE_KEY } from "@/lib/i18n/types";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api/products", () => ({
  searchProducts: vi.fn(),
  isUpstreamSearchError: () => false,
}));

vi.mock("@/lib/api/searches", () => ({
  getRecentSearches: vi.fn(async () => []),
  recordRecentSearch: vi.fn(),
}));

import { searchProducts } from "@/lib/api/products";
import { getRecentSearches, recordRecentSearch } from "@/lib/api/searches";

const searchProductsMock = searchProducts as ReturnType<typeof vi.fn>;
const getRecentSearchesMock = getRecentSearches as ReturnType<typeof vi.fn>;
const recordRecentSearchMock = recordRecentSearch as ReturnType<typeof vi.fn>;

describe("LanguageProvider persistence", () => {
  beforeEach(() => {
    getRecentSearchesMock.mockResolvedValue([]);
    searchProductsMock.mockReset();
    recordRecentSearchMock.mockReset();
  });
  it("defaults to English when nothing is stored", async () => {
    renderWithProviders(<LanguageSelector />);

    await waitFor(() => {
      expect(screen.getByLabelText("Language")).toHaveValue("en");
    });
  });

  it("restores a valid stored language", async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");
    renderWithProviders(<LanguageSelector />);

    await waitFor(() => {
      expect(screen.getByLabelText("Langue")).toHaveValue("fr");
    });
  });

  it("falls back to English for invalid stored values", async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "es");
    renderWithProviders(<LanguageSelector />);

    await waitFor(() => {
      expect(screen.getByLabelText("Language")).toHaveValue("en");
    });
  });

  it("persists a manual language selection", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSelector />);

    await waitFor(() => {
      expect(screen.getByLabelText("Language")).toBeEnabled();
    });

    await user.selectOptions(screen.getByLabelText("Language"), "de");

    expect(screen.getByLabelText("Sprache")).toHaveValue("de");
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("de");
  });
});

describe("language change with active search", () => {
  it("refetches the active query without recording history when language changes", async () => {
    const user = userEvent.setup();
    searchProductsMock.mockResolvedValue({
      query: "Nutella",
      page: 1,
      pageSize: 12,
      total: 1,
      products: [
        {
          barcode: "3017620422003",
          name: "Nutella",
          brand: "Ferrero",
          imageUrl: null,
          languageUsed: "en",
        },
      ],
    });
    recordRecentSearchMock.mockResolvedValue({
      id: "rs_1",
      query: "Nutella",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    renderWithProviders(
      <>
        <LanguageSelector />
        <SearchPanel />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Search" })).toBeEnabled();
    });

    await user.type(screen.getByRole("searchbox"), "Nutella");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("heading", { name: "Nutella" })).toBeInTheDocument();
    expect(recordRecentSearchMock).toHaveBeenCalledTimes(1);
    expect(searchProductsMock).toHaveBeenCalledTimes(1);

    searchProductsMock.mockResolvedValue({
      query: "Nutella",
      page: 1,
      pageSize: 12,
      total: 1,
      products: [
        {
          barcode: "3017620422003",
          name: "Nutella",
          brand: "Ferrero",
          imageUrl: null,
          languageUsed: "fr",
        },
      ],
    });

    await user.selectOptions(screen.getByLabelText("Language"), "fr");

    await waitFor(() => {
      expect(searchProductsMock).toHaveBeenCalledTimes(2);
    });

    expect(searchProductsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: "Nutella",
        language: "fr",
        page: 1,
      }),
    );
    expect(recordRecentSearchMock).toHaveBeenCalledTimes(1);
  });
});
