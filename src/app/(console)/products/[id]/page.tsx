import { ProductDetailScreen } from "@/features/products/product-detail-screen";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductDetailScreen productId={id} />;
}
