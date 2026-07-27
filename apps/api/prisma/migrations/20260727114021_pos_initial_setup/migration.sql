-- DropForeignKey
ALTER TABLE "pos_invoice_sequences" DROP CONSTRAINT "pos_invoice_sequences_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_outlets" DROP CONSTRAINT "pos_outlets_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_settings" DROP CONSTRAINT "pos_settings_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_tax_group_rates" DROP CONSTRAINT "pos_tax_group_rates_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_tax_groups" DROP CONSTRAINT "pos_tax_groups_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "pos_tax_rates" DROP CONSTRAINT "pos_tax_rates_tenantId_fkey";
