import type { Metadata } from "next";
import { ProductPage } from "@/components/product-page";
import { marketingProducts } from "@/content/products";

export const metadata: Metadata = {
  title: "Liqaa POS | Connected Commerce Operations",
  description:
    "Point of sale, catalog control and inventory visibility built on the Liqaa platform.",
};

export default function PosPage() {
  return <ProductPage product={marketingProducts.pos} />;
}
