import { ProductFormView } from "@/features/products/pos/catalog/product-form-view";

export default function EditProductPage({ params }: { params: { id: string } }) {
  return <ProductFormView productId={params.id} />;
}
