-- CreateEnum
CREATE TYPE "PosTaxType" AS ENUM ('VAT', 'EXEMPT', 'ZERO_RATED', 'OUT_OF_SCOPE');

-- CreateTable
CREATE TABLE "pos_settings" (
    "tenantId" UUID NOT NULL,
    "vatNumber" TEXT,
    "vatRegistrationType" TEXT,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT true,
    "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
    "autoPrintReceipt" BOOLEAN NOT NULL DEFAULT true,
    "maxDiscountPercent" DECIMAL(5,3) NOT NULL DEFAULT 0,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 7,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "receiptHeader" TEXT,
    "receiptFooter" TEXT,
    "logoUrl" TEXT,
    "initializedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_settings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "pos_invoice_sequences" (
    "tenantId" UUID NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pos_invoice_sequences_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "pos_outlets" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "vatNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_tax_rates" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,3) NOT NULL,
    "type" "PosTaxType" NOT NULL DEFAULT 'VAT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_tax_groups" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_tax_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_tax_group_rates" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "taxGroupId" UUID NOT NULL,
    "taxRateId" UUID NOT NULL,

    CONSTRAINT "pos_tax_group_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pos_outlets_tenantId_isActive_idx" ON "pos_outlets"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "pos_outlets_tenantId_name_key" ON "pos_outlets"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pos_tax_rates_tenantId_name_key" ON "pos_tax_rates"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pos_tax_groups_tenantId_name_key" ON "pos_tax_groups"("tenantId", "name");

-- CreateIndex
CREATE INDEX "pos_tax_group_rates_tenantId_idx" ON "pos_tax_group_rates"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "pos_tax_group_rates_taxGroupId_taxRateId_key" ON "pos_tax_group_rates"("taxGroupId", "taxRateId");

-- AddForeignKey
ALTER TABLE "pos_tax_group_rates" ADD CONSTRAINT "pos_tax_group_rates_taxGroupId_fkey" FOREIGN KEY ("taxGroupId") REFERENCES "pos_tax_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_tax_group_rates" ADD CONSTRAINT "pos_tax_group_rates_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "pos_tax_rates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------
-- Tenant foreign keys
-- ---------------------------------------------------------------
ALTER TABLE "pos_settings" ADD CONSTRAINT "pos_settings_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_invoice_sequences" ADD CONSTRAINT "pos_invoice_sequences_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_outlets" ADD CONSTRAINT "pos_outlets_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_tax_rates" ADD CONSTRAINT "pos_tax_rates_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_tax_groups" ADD CONSTRAINT "pos_tax_groups_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_tax_group_rates" ADD CONSTRAINT "pos_tax_group_rates_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------
-- Row Level Security
-- Every POS table is tenant scoped and fails closed when app.tenant_id is unset.
-- ---------------------------------------------------------------
DO $$
DECLARE
  table_name text;
  pos_tables text[] := ARRAY[
    'pos_settings', 'pos_invoice_sequences', 'pos_outlets',
    'pos_tax_rates', 'pos_tax_groups', 'pos_tax_group_rates'
  ];
BEGIN
  FOREACH table_name IN ARRAY pos_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO app_user USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS platform_access ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY platform_access ON %I TO platform_runtime USING (true) WITH CHECK (true)',
      table_name
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- Grants
-- pos_invoice_sequences needs UPDATE for the gapless invoice allocator; without it
-- the failure only surfaces at the first checkout.
-- ---------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "pos_settings", "pos_invoice_sequences", "pos_outlets",
  "pos_tax_rates", "pos_tax_groups", "pos_tax_group_rates"
TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "pos_settings", "pos_invoice_sequences", "pos_outlets",
  "pos_tax_rates", "pos_tax_groups", "pos_tax_group_rates"
TO platform_runtime;
