"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductImage } from "./ProductImage";
import { NutritionTable } from "./NutritionTable";
import { SubscriptionControls } from "./SubscriptionControls";
import { useBilling } from "./BillingProvider";
import { ApiError } from "@/lib/api/types";
import {
  getProductByBarcode,
  isUpstreamSearchError,
} from "@/lib/api/products";
import type { ProductDetail } from "@/lib/api/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type ProductDetailViewProps = {
  barcode: string;
};

type DetailState =
  | { status: "loading" }
  | { status: "success"; product: ProductDetail }
  | { status: "error"; code: string };

export function ProductDetailView({ barcode }: ProductDetailViewProps) {
  const { language, isLanguageReady, t, tError } = useTranslation();
  const { state: billingState } = useBilling();
  const [state, setState] = useState<DetailState>({ status: "loading" });

  async function load(signal?: AbortSignal) {
    if (!isLanguageReady) {
      return;
    }

    setState({ status: "loading" });
    try {
      const product = await getProductByBarcode({
        barcode,
        language,
        signal,
      });
      if (signal?.aborted) {
        return;
      }
      setState({ status: "success", product });
    } catch (error) {
      if (
        signal?.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }
      if (error instanceof ApiError) {
        setState({
          status: "error",
          code: error.code,
        });
        return;
      }
      setState({
        status: "error",
        code: "UNKNOWN_ERROR",
      });
    }
  }

  useEffect(() => {
    if (!isLanguageReady) {
      return;
    }

    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
    // Refetch when barcode or language changes after language is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, language, isLanguageReady]);

  if (!isLanguageReady || state.status === "loading") {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-4 w-28 animate-pulse rounded bg-[var(--skeleton)]" />
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="aspect-square h-56 w-56 animate-pulse rounded-xl bg-[var(--skeleton)]" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--skeleton)]" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--skeleton)]" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-[var(--skeleton)]" />
          </div>
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-[var(--skeleton)]" />
      </div>
    );
  }

  if (state.status === "error") {
    const isNotFound = state.code === "PRODUCT_NOT_FOUND";
    return (
      <div className="space-y-5">
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {t("detail.back")}
        </Link>
        <div
          className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-5"
          role="alert"
        >
          <p className="font-medium text-[var(--danger-text)]">
            {isNotFound
              ? t("detail.notFound")
              : isUpstreamSearchError(state.code)
                ? t("detail.upstreamError")
                : tError(state.code)}
          </p>
          {!isNotFound ? (
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 rounded-lg border border-[color-mix(in_srgb,var(--danger-border)_80%,#c49a8f)] bg-[var(--surface-raised)] px-3 py-2 text-sm font-medium text-[var(--danger-text)] transition hover:bg-[#fff8f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger-text)]"
            >
              {t("detail.retry")}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const { product } = state;
  const name = product.name ?? t("product.unknownName");
  const brand = product.brand ?? t("product.brandUnavailable");

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        {t("detail.back")}
      </Link>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <ProductImage
          src={product.imageUrl}
          alt={name}
          className="h-56 w-56 rounded-xl border border-[var(--border)]"
        />
        <div className="min-w-0 flex-1 sm:pt-1">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            {name}
          </h1>
          <p className="mt-2 text-base text-[var(--text-secondary)]">{brand}</p>
          <p className="mt-4 font-mono text-sm tracking-wide text-[var(--text-muted)]">
            {t("detail.barcode", { barcode: product.barcode })}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {t("detail.nutritionTitle")}
        </h2>
        {product.nutritionAccess === "locked" ? (
          <div className="mt-4 max-w-xl space-y-4 border-t border-[var(--border)] pt-4">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {t("detail.nutritionLocked")}
            </p>
            {billingState.status === "ready" &&
            !billingState.user.hasNutritionAccess ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[var(--text-muted)]">
                  {t("billing.price")}
                </span>
                <SubscriptionControls compact />
              </div>
            ) : null}
          </div>
        ) : product.nutrition ? (
          <NutritionTable per100g={product.nutrition.per100g} />
        ) : null}
      </section>
    </div>
  );
}
