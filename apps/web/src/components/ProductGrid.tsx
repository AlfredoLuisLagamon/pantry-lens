import { ProductCard } from "./ProductCard";
import type { ProductSummary } from "@/lib/api/types";

type ProductGridProps = {
  products: ProductSummary[];
};

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li key={product.barcode} className="h-full">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton() {
  return (
    <ul
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <li
          key={index}
          className="flex gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
        >
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-lg bg-[var(--skeleton)]" />
          <div className="flex flex-1 flex-col justify-center gap-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--skeleton)]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--skeleton)]" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--skeleton)]" />
          </div>
        </li>
      ))}
    </ul>
  );
}
