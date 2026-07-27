-- Payroll Phase 1 corrective schema additions.
ALTER TABLE "payroll_calendars" ADD COLUMN IF NOT EXISTS "code" TEXT;
UPDATE "payroll_calendars" SET "code" = upper(regexp_replace("name", '[^A-Za-z0-9]+', '_', 'g')) WHERE "code" IS NULL;
ALTER TABLE "payroll_calendars" ALTER COLUMN "code" SET NOT NULL;
DROP INDEX IF EXISTS "payroll_calendars_tenantId_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_calendars_tenantId_code_version_key" ON "payroll_calendars"("tenantId", "code", "version");
CREATE INDEX IF NOT EXISTS "payroll_calendars_tenantId_code_status_idx" ON "payroll_calendars"("tenantId", "code", "status");

ALTER TABLE "employee_payment_details" ADD COLUMN IF NOT EXISTS "ibanCiphertext" TEXT;
ALTER TABLE "employee_payment_details" ADD COLUMN IF NOT EXISTS "ibanLast4" TEXT;
ALTER TABLE "employee_payment_details" ADD COLUMN IF NOT EXISTS "swiftBic" TEXT;
ALTER TABLE "employee_payment_details" ADD COLUMN IF NOT EXISTS "encryptionKeyVersion" TEXT;
ALTER TABLE "employee_payment_details" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

ALTER TABLE "employee_statutory_details" ADD COLUMN IF NOT EXISTS "encryptionKeyVersion" TEXT;
ALTER TABLE "employee_statutory_details" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';
