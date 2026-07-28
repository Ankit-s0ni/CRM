-- DropForeignKey
ALTER TABLE "pos_bundle_components" DROP CONSTRAINT "pos_bundle_components_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_bundles" DROP CONSTRAINT "pos_bundles_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_categories" DROP CONSTRAINT "pos_categories_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_product_import_jobs" DROP CONSTRAINT "pos_product_import_jobs_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_product_import_rows" DROP CONSTRAINT "pos_product_import_rows_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_products" DROP CONSTRAINT "pos_products_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_units_of_measure" DROP CONSTRAINT "pos_units_of_measure_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_variants" DROP CONSTRAINT "pos_variants_tenantId_fkey";
