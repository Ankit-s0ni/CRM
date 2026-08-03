import type { Metadata } from "next";
import { ProductPage } from "@/components/product-page";
import { marketingProducts } from "@/content/products";

export const metadata: Metadata = {
  title: "DeltCRM POS | Connected Commerce Operations",
  description: "Connect checkout, products, stores and inventory in one dependable commerce system.",
};

export default function PosPage() {
  return <ProductPage product={marketingProducts.pos} />;
}
