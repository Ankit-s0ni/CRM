import type { Metadata } from "next";
import { ProductPage } from "@/components/product-page";
import { marketingProducts } from "@/content/products";

export const metadata: Metadata = {
  title: "Liqaa TMS | Connected Task & Ticket Management",
  description:
    "Manage projects, agile tickets, Kanban boards, custom status pipelines, and spreadsheet migrations on the same operating core as Liqaa HRMS.",
};

export default function TmsPage() {
  return <ProductPage product={marketingProducts.tms} />;
}
