import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductDetailView } from "@/components/ProductDetailView";
import { NutritionTable } from "@/components/NutritionTable";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api/products", () => ({
  getProductByBarcode: vi.fn(),
  isUpstreamSearchError: () => false,
}));

vi.mock("@/lib/api/user", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/api/billing", () => ({
  createCheckoutSession: vi.fn(),
}));

import { getProductByBarcode } from "@/lib/api/products";
import { getUser } from "@/lib/api/user";

const getProductByBarcodeMock = getProductByBarcode as ReturnType<typeof vi.fn>;
const getUserMock = getUser as ReturnType<typeof vi.fn>;

describe("ProductDetailView nutrition display", () => {
  beforeEach(() => {
    getProductByBarcodeMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: null,
      hasNutritionAccess: false,
    });
  });

  it("shows locked explanation and hides nutrition values", async () => {
    getProductByBarcodeMock.mockResolvedValue({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: null,
      languageUsed: "en",
      nutrition: null,
      nutritionAccess: "locked",
    });

    renderWithProviders(<ProductDetailView barcode="3017620422003" />, {
      withBilling: true,
    });

    expect(
      await screen.findByText(
        /Nutrition information is available with a subscription/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("999 kcal")).not.toBeInTheDocument();
    expect(screen.queryByText("123 g")).not.toBeInTheDocument();
    expect(screen.queryByText("Per 100 g")).not.toBeInTheDocument();
  });

  it("renders granted nutrition values from the product API", async () => {
    getUserMock.mockResolvedValue({
      id: "user_1",
      email: "demo@pantry-lens.local",
      displayName: "Demo User",
      subscription: {
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      hasNutritionAccess: true,
    });
    getProductByBarcodeMock.mockResolvedValue({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: null,
      languageUsed: "en",
      nutritionAccess: "granted",
      nutrition: {
        per100g: {
          energyKcal: 539,
          fat: 30.9,
          saturatedFat: 10.6,
          carbohydrates: 57.5,
          sugars: 56.3,
          fiber: null,
          proteins: 6.3,
          salt: 0.107,
        },
      },
    });

    renderWithProviders(<ProductDetailView barcode="3017620422003" />, {
      withBilling: true,
    });

    expect(await screen.findByText("Per 100 g")).toBeInTheDocument();
    expect(screen.getByText("539 kcal")).toBeInTheDocument();
    expect(screen.getByText("30.9 g")).toBeInTheDocument();
    expect(screen.getByText("6.3 g")).toBeInTheDocument();
  });

  it("refetches the same barcode when language changes", async () => {
    const user = userEvent.setup();
    getProductByBarcodeMock.mockResolvedValue({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: null,
      languageUsed: "en",
      nutrition: null,
      nutritionAccess: "locked",
    });

    const { LanguageSelector } = await import("@/components/LanguageSelector");

    renderWithProviders(
      <>
        <LanguageSelector />
        <ProductDetailView barcode="3017620422003" />
      </>,
      { withBilling: true },
    );

    await waitFor(() => {
      expect(getProductByBarcodeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          barcode: "3017620422003",
          language: "en",
        }),
      );
    });

    getProductByBarcodeMock.mockResolvedValue({
      barcode: "3017620422003",
      name: "Nutella",
      brand: "Ferrero",
      imageUrl: null,
      languageUsed: "fr",
      nutrition: null,
      nutritionAccess: "locked",
    });

    await user.selectOptions(screen.getByLabelText("Language"), "fr");

    await waitFor(() => {
      expect(getProductByBarcodeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          barcode: "3017620422003",
          language: "fr",
        }),
      );
    });
  });
});

describe("NutritionTable incomplete values", () => {
  it("shows an em dash for null nutrients instead of zero", async () => {
    renderWithProviders(
      <NutritionTable
        per100g={{
          energyKcal: 539,
          fat: null,
          saturatedFat: null,
          carbohydrates: 57.5,
          sugars: null,
          fiber: null,
          proteins: 6.3,
          salt: null,
        }}
      />,
    );

    expect(await screen.findByText("539 kcal")).toBeInTheDocument();
    expect(screen.getByText("6.3 g")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByText("0 g")).not.toBeInTheDocument();
    expect(screen.queryByText("0 kcal")).not.toBeInTheDocument();
  });
});
