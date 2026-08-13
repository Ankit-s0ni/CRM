-- CreateEnum
CREATE TYPE "ProductCapabilityCommercialType" AS ENUM ('CORE', 'ADD_ON');

-- AlterTable
ALTER TABLE "product_capability_definitions"
ADD COLUMN "commercialType" "ProductCapabilityCommercialType" NOT NULL DEFAULT 'CORE';

-- AlterTable
ALTER TABLE "registered_products"
ADD COLUMN "apiPrefix" TEXT NOT NULL,
ADD COLUMN "webPath" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "registered_products_webPath_key"
ON "registered_products"("webPath");

-- CreateIndex
CREATE UNIQUE INDEX "registered_products_apiPrefix_key"
ON "registered_products"("apiPrefix");
