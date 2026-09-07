"use client";

import Link from "next/link";

import { ProductImage } from "./ProductImage";
import type { ProductSummary } from "@/lib/api/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

type ProductCardProps = {
  product: ProductSummary;
};

export function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();
  const name = product.name ?? t("product.unknownName");
  const brand = product.brand ?? t("product.brandUnavailable");

  return (
    <Link
      href={`/products/${encodeURIComponent(product.barcode)}`}
      className="group flex h-full gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[color-mix(in_srgb,var(--border-strong)_70%,var(--accent))] hover:bg-[var(--surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      <ProductImage
        src={product.imageUrl}
        alt={name}
        className="h-24 w-24 shrink-0 rounded-lg"
      />
      <div className="min-w-0 flex-1 self-center">
        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--foreground)] group-hover:text-[var(--accent)]">
          {name}
        </h2>
        <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
          {brand}
        </p>
        <p className="mt-2 font-mono text-xs tracking-wide text-[var(--text-muted)]">
          {product.barcode}
        </p>
      </div>
    </Link>
  );
}
