-- Sprint 1.4 persistent import rows and processing metadata.

CREATE TYPE "ImportRowStatus" AS ENUM ('PENDING', 'VALIDATED', 'IMPORTED', 'ERROR');

ALTER TABLE "import_jobs"
  ADD COLUMN "objectKey" TEXT,
  ADD COLUMN "originalFilename" TEXT,
  ADD COLUMN "contentType" TEXT,
  ADD COLUMN "fileSize" INTEGER,
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "employee_import_rows" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "importJobId" UUID NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "employeeCode" TEXT,
  "rawData" JSONB NOT NULL,
  "normalizedData" JSONB,
  "status" "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "isRetryable" BOOLEAN NOT NULL DEFAULT false,
  "employeeId" UUID,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_import_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_import_rows_tenantId_importJobId_rowNumber_key"
  ON "employee_import_rows" ("tenantId", "importJobId", "rowNumber");
CREATE UNIQUE INDEX "employee_import_rows_tenantId_idempotencyKey_key"
  ON "employee_import_rows" ("tenantId", "idempotencyKey");
CREATE INDEX "employee_import_rows_tenantId_importJobId_status_idx"
  ON "employee_import_rows" ("tenantId", "importJobId", "status");

ALTER TABLE "employee_import_rows"
  ADD CONSTRAINT "employee_import_rows_importJobId_fkey"
  FOREIGN KEY ("importJobId") REFERENCES "import_jobs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_import_rows"
  ADD CONSTRAINT "employee_import_rows_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_import_rows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_import_rows" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "employee_import_rows"
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "employee_import_rows" TO app_user;
