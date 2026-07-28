-- CreateEnum
CREATE TYPE "PosImportMode" AS ENUM ('CREATE', 'UPSERT');

-- CreateTable
CREATE TABLE "pos_categories" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "imageKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_units_of_measure" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "baseUnitId" UUID,
    "conversionFactor" DECIMAL(12,4),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_units_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_products" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "categoryId" UUID,
    "taxGroupId" UUID,
    "unitOfMeasureId" UUID,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT,
    "brand" TEXT,
    "vatCode" TEXT,
    "costPrice" DECIMAL(12,3) NOT NULL,
    "sellingPrice" DECIMAL(12,3) NOT NULL,
    "mrp" DECIMAL(12,3),
    "wholesalePrice" DECIMAL(12,3),
    "weight" DECIMAL(8,3),
    "imageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
    "sellByWeight" BOOLEAN NOT NULL DEFAULT false,
    "reorderPoint" INTEGER,
    "reorderQuantity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_variants" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "costPrice" DECIMAL(12,3),
    "sellingPrice" DECIMAL(12,3),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "imageKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_bundles" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "bundlePrice" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_bundle_components" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "bundleId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "pos_bundle_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_product_import_jobs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestedBy" UUID NOT NULL,
    "mode" "PosImportMode" NOT NULL DEFAULT 'CREATE',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "objectKey" TEXT NOT NULL,
    "originalFilename" TEXT,
    "contentType" TEXT,
    "fileSize" INTEGER,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "rowErrors" JSONB NOT NULL DEFAULT '[]',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "idempotencyKey" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_product_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_product_import_rows" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "importJobId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "sku" TEXT,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "productId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_product_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_categories_tenantId_parentId_sortOrder_idx" ON "pos_categories"("tenantId", "parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "pos_categories_tenantId_name_parentId_key" ON "pos_categories"("tenantId", "name", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_units_of_measure_tenantId_code_key" ON "pos_units_of_measure"("tenantId", "code");

-- CreateIndex
CREATE INDEX "pos_products_tenantId_isActive_idx" ON "pos_products"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "pos_products_tenantId_categoryId_idx" ON "pos_products"("tenantId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_products_tenantId_sku_key" ON "pos_products"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "pos_products_tenantId_barcode_key" ON "pos_products"("tenantId", "barcode");

-- CreateIndex
CREATE INDEX "pos_variants_tenantId_productId_idx" ON "pos_variants"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_variants_tenantId_sku_key" ON "pos_variants"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "pos_variants_tenantId_barcode_key" ON "pos_variants"("tenantId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "pos_bundles_productId_key" ON "pos_bundles"("productId");

-- CreateIndex
CREATE INDEX "pos_bundle_components_tenantId_bundleId_idx" ON "pos_bundle_components"("tenantId", "bundleId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_bundle_components_bundleId_productId_variantId_key" ON "pos_bundle_components"("bundleId", "productId", "variantId");

-- CreateIndex
CREATE INDEX "pos_product_import_jobs_tenantId_createdAt_idx" ON "pos_product_import_jobs"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "pos_product_import_jobs_tenantId_idempotencyKey_key" ON "pos_product_import_jobs"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "pos_product_import_rows_tenantId_importJobId_status_idx" ON "pos_product_import_rows"("tenantId", "importJobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pos_product_import_rows_tenantId_importJobId_rowNumber_key" ON "pos_product_import_rows"("tenantId", "importJobId", "rowNumber");

-- AddForeignKey
ALTER TABLE "pos_categories" ADD CONSTRAINT "pos_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "pos_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_units_of_measure" ADD CONSTRAINT "pos_units_of_measure_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "pos_units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_products" ADD CONSTRAINT "pos_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "pos_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_products" ADD CONSTRAINT "pos_products_taxGroupId_fkey" FOREIGN KEY ("taxGroupId") REFERENCES "pos_tax_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_products" ADD CONSTRAINT "pos_products_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "pos_units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_variants" ADD CONSTRAINT "pos_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "pos_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_bundles" ADD CONSTRAINT "pos_bundles_productId_fkey" FOREIGN KEY ("productId") REFERENCES "pos_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_bundle_components" ADD CONSTRAINT "pos_bundle_components_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "pos_bundles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_bundle_components" ADD CONSTRAINT "pos_bundle_components_productId_fkey" FOREIGN KEY ("productId") REFERENCES "pos_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_bundle_components" ADD CONSTRAINT "pos_bundle_components_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "pos_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_product_import_rows" ADD CONSTRAINT "pos_product_import_rows_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "pos_product_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_product_import_rows" ADD CONSTRAINT "pos_product_import_rows_productId_fkey" FOREIGN KEY ("productId") REFERENCES "pos_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------
-- Tenant foreign keys
-- ---------------------------------------------------------------
DO $$
DECLARE
  t text;
  pos_tables text[] := ARRAY[
    'pos_categories', 'pos_units_of_measure', 'pos_products', 'pos_variants',
    'pos_bundles', 'pos_bundle_components',
    'pos_product_import_jobs', 'pos_product_import_rows'
  ];
BEGIN
  FOREACH t IN ARRAY pos_tables LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
      t, t || '_tenantId_fkey'
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- Row Level Security — every POS table is tenant scoped and fails
-- closed when app.tenant_id is unset.
-- ---------------------------------------------------------------
DO $$
DECLARE
  t text;
  pos_tables text[] := ARRAY[
    'pos_categories', 'pos_units_of_measure', 'pos_products', 'pos_variants',
    'pos_bundles', 'pos_bundle_components',
    'pos_product_import_jobs', 'pos_product_import_rows'
  ];
BEGIN
  FOREACH t IN ARRAY pos_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO app_user USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS platform_access ON %I', t);
    EXECUTE format(
      'CREATE POLICY platform_access ON %I TO platform_runtime USING (true) WITH CHECK (true)',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO app_user', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO platform_runtime', t);
  END LOOP;
END $$;
