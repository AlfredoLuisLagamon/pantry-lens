import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SearchPanel } from "@/components/SearchPanel";
import { ApiError } from "@/lib/api/types";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api/products", () => ({
  searchProducts: vi.fn(),
  isUpstreamSearchError: (code: string) =>
    code === "OFF_UPSTREAM" || code === "OFF_TIMEOUT",
}));

vi.mock("@/lib/api/searches", () => ({
  getRecentSearches: vi.fn(),
  recordRecentSearch: vi.fn(),
}));

import { searchProducts } from "@/lib/api/products";
import { getRecentSearches, recordRecentSearch } from "@/lib/api/searches";

const searchProductsMock = searchProducts as ReturnType<typeof vi.fn>;
const getRecentSearchesMock = getRecentSearches as ReturnType<typeof vi.fn>;
const recordRecentSearchMock = recordRecentSearch as ReturnType<typeof vi.fn>;

async function readySearchPanel() {
  renderWithProviders(<SearchPanel />);
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Search" })).toBeEnabled();
  });
}

describe("SearchPanel", () => {
  beforeEach(() => {
    searchProductsMock.mockReset();
    getRecentSearchesMock.mockReset();
    recordRecentSearchMock.mockReset();
    getRecentSearchesMock.mockResolvedValue([]);
    recordRecentSearchMock.mockResolvedValue({
      id: "rs_1",
      query: "oreo",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("shows validation and does not search for a one-character query", async () => {
    const user = userEvent.setup();
    await readySearchPanel();

    await user.type(screen.getByRole("searchbox"), "a");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("Enter at least 2 characters to search.");
    expect(searchProductsMock).not.toHaveBeenCalled();
  });

  it("renders successful search results with product links", async () => {
    const user = userEvent.setup();
    searchProductsMock.mockResolvedValue({
      query: "oreo",
      page: 1,
      pageSize: 12,
      total: 1,
      products: [
        {
          barcode: "7622300336738",
          name: "Oreo",
          brand: "Mondelez",
          imageUrl: "https://example.com/oreo.jpg",
          languageUsed: "en",
        },
      ],
    });

    await readySearchPanel();
    await user.type(screen.getByRole("searchbox"), "oreo");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("heading", { name: "Oreo" })).toBeInTheDocument();
    expect(screen.getByText("Mondelez")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Oreo/i })).toHaveAttribute(
      "href",
      "/products/7622300336738",
    );
    expect(searchProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "oreo",
        page: 1,
        language: "en",
      }),
    );
    expect(recordRecentSearchMock).toHaveBeenCalledTimes(1);
  });

  it("shows empty-state copy when no products match", async () => {
    const user = userEvent.setup();
    searchProductsMock.mockResolvedValue({
      query: "zzzz",
      page: 1,
      pageSize: 12,
      total: 0,
      products: [],
    });

    await readySearchPanel();
    await user.type(screen.getByRole("searchbox"), "zzzz");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findByText('No products found for “zzzz”.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Try a different product name or search term."),
    ).toBeInTheDocument();
  });

  it("shows upstream failure messaging and retries the search", async () => {
    const user = userEvent.setup();
    searchProductsMock
      .mockRejectedValueOnce(
        new ApiError(502, "OFF_UPSTREAM", "upstream unavailable"),
      )
      .mockResolvedValueOnce({
        query: "oreo",
        page: 1,
        pageSize: 12,
        total: 1,
        products: [
          {
            barcode: "7622300336738",
            name: "Oreo",
            brand: "Mondelez",
            imageUrl: null,
            languageUsed: "en",
          },
        ],
      });

    await readySearchPanel();
    await user.type(screen.getByRole("searchbox"), "oreo");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findByText(
        "Product search is temporarily unavailable. Try again.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Oreo" })).toBeInTheDocument();
    expect(searchProductsMock).toHaveBeenCalledTimes(2);
  });

  it("falls back for missing product name, brand, and image", async () => {
    const user = userEvent.setup();
    searchProductsMock.mockResolvedValue({
      query: "mystery",
      page: 1,
      pageSize: 12,
      total: 1,
      products: [
        {
          barcode: "1234567890123",
          name: null,
          brand: null,
          imageUrl: null,
          languageUsed: null,
        },
      ],
    });

    await readySearchPanel();
    await user.type(screen.getByRole("searchbox"), "mystery");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findByRole("heading", { name: "Unknown product" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Brand unavailable")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Unknown product" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Unknown product/i }),
    ).toHaveAttribute("href", "/products/1234567890123");
  });

  it("keeps product results when recording recent history fails", async () => {
    const user = userEvent.setup();
    searchProductsMock.mockResolvedValue({
      query: "oreo",
      page: 1,
      pageSize: 12,
      total: 1,
      products: [
        {
          barcode: "7622300336738",
          name: "Oreo",
          brand: "Mondelez",
          imageUrl: null,
          languageUsed: "en",
        },
      ],
    });
    recordRecentSearchMock.mockRejectedValue(
      new ApiError(503, "DATABASE_UNAVAILABLE", "db down"),
    );

    await readySearchPanel();
    await user.type(screen.getByRole("searchbox"), "oreo");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByRole("heading", { name: "Oreo" })).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Recent searches unavailable (database not connected).",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Product search is temporarily unavailable. Try again."),
    ).not.toBeInTheDocument();
  });

  it("loads recent searches and reuses search with the current language", async () => {
    const user = userEvent.setup();
    getRecentSearchesMock.mockResolvedValue([
      {
        id: "rs_1",
        query: "Nutella",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
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

    await readySearchPanel();
    expect(
      await screen.findByRole("button", { name: "Nutella" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nutella" }));
    expect(await screen.findByRole("heading", { name: "Nutella" })).toBeInTheDocument();
    expect(searchProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "Nutella",
        language: "en",
        page: 1,
      }),
    );
    expect(recordRecentSearchMock).toHaveBeenCalledTimes(1);
  });

  it("does not record history when paginating to the next page", async () => {
    const user = userEvent.setup();
    const pageProducts = Array.from({ length: 12 }, (_, index) => ({
      barcode: `10000000000${index}`,
      name: `Product ${index}`,
      brand: "Brand",
      imageUrl: null,
      languageUsed: "en" as const,
    }));

    searchProductsMock
      .mockResolvedValueOnce({
        query: "oreo",
        page: 1,
        pageSize: 12,
        total: 24,
        products: pageProducts,
      })
      .mockResolvedValueOnce({
        query: "oreo",
        page: 2,
        pageSize: 12,
        total: 24,
        products: pageProducts.map((product, index) => ({
          ...product,
          barcode: `20000000000${index}`,
          name: `Page2 ${index}`,
        })),
      });

    await readySearchPanel();
    await user.type(screen.getByRole("searchbox"), "oreo");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("heading", { name: "Product 0" })).toBeInTheDocument();
    expect(recordRecentSearchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("heading", { name: "Page2 0" })).toBeInTheDocument();
    expect(recordRecentSearchMock).toHaveBeenCalledTimes(1);
    expect(searchProductsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, language: "en" }),
    );
  });
});
