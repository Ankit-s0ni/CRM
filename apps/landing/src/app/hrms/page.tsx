import type { Metadata } from "next";
import { ProductPage } from "@/components/product-page";
import { marketingProducts } from "@/content/products";

export const metadata: Metadata = {
  title: "Liqaa HRMS | Connected People Operations",
  description:
    "Attendance, leave, payroll, document compliance and field staff operations in one modular product.",
};

export default function HrmsPage() {
  return <ProductPage product={marketingProducts.hrms} />;
}
