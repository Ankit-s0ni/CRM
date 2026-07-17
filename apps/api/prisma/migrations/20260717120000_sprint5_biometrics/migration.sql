CREATE TYPE "FaceEnrollmentStatus" AS ENUM ('ACTIVE', 'REPLACED', 'REVOKED');

CREATE TABLE "face_enrollments" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "privateObjectKey" TEXT NOT NULL,
  "embeddingRef" TEXT NOT NULL,
  "livenessProvider" TEXT NOT NULL,
  "status" "FaceEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "enrolledBy" UUID NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "face_enrollments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "face_enrollments_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "face_enrollments_tenantId_employeeId_version_key"
  ON "face_enrollments"("tenantId", "employeeId", "version");
CREATE INDEX "face_enrollments_tenantId_employeeId_status_idx"
  ON "face_enrollments"("tenantId", "employeeId", "status");
CREATE UNIQUE INDEX "face_enrollments_one_active_per_employee"
  ON "face_enrollments"("tenantId", "employeeId")
  WHERE "status" = 'ACTIVE';

ALTER TABLE "face_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "face_enrollments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "face_enrollments"
  USING (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON "face_enrollments" TO app_user;
