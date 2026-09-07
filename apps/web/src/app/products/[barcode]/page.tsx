import { AppShell } from "@/components/AppShell";
import { ProductDetailView } from "@/components/ProductDetailView";

type ProductPageProps = {
  params: Promise<{ barcode: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { barcode } = await params;

  return (
    <AppShell>
      <ProductDetailView barcode={decodeURIComponent(barcode)} />
    </AppShell>
  );
}
