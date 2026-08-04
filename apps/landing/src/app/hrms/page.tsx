import type { Metadata } from "next";
import { ProductPage } from "@/components/product-page";
import { marketingProducts } from "@/content/products";

export const metadata: Metadata = {
  title: "DeltCRM HRMS | Connected People Operations",
  description: "Employee records, attendance, shifts, leave and workforce controls in one connected HRMS.",
};

export default function HrmsPage() {
  return <ProductPage product={marketingProducts.hrms} />;
}
