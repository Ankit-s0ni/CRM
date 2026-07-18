CREATE TYPE "AttendanceLocationMode" AS ENUM ('NONE', 'OFFICE_GEOFENCE', 'FIELD_GPS');
CREATE TYPE "SelfieMode" AS ENUM ('DISABLED', 'REQUIRED');

ALTER TABLE "tenant_settings"
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "fieldTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "runtimeConfigVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "attendance_policies"
  ADD COLUMN "locationMode" "AttendanceLocationMode" NOT NULL DEFAULT 'OFFICE_GEOFENCE',
  ADD COLUMN "selfieMode" "SelfieMode" NOT NULL DEFAULT 'DISABLED',
  ADD COLUMN "fieldTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowHybridFieldTracking" BOOLEAN NOT NULL DEFAULT false;

UPDATE "attendance_policies"
SET
  "locationMode" = CASE
    WHEN "requireGeofence" THEN 'OFFICE_GEOFENCE'::"AttendanceLocationMode"
    ELSE 'NONE'::"AttendanceLocationMode"
  END,
  "selfieMode" = CASE
    WHEN "requireFaceMatch" THEN 'REQUIRED'::"SelfieMode"
    ELSE 'DISABLED'::"SelfieMode"
  END,
  "fieldTrackingEnabled" = true,
  "allowHybridFieldTracking" = true;

UPDATE "tenant_settings" AS settings
SET "fieldTrackingEnabled" = EXISTS (
  SELECT 1
  FROM "tenant_modules" AS tenant_module
  JOIN "modules" AS module ON module."id" = tenant_module."moduleId"
  WHERE tenant_module."tenantId" = settings."tenantId"
    AND tenant_module."isActive" = true
    AND module."key" = 'FIELD_TRACKING'
    AND module."availability" = 'AVAILABLE'
);

ALTER TABLE "tenant_settings"
  ADD CONSTRAINT "tenant_settings_runtime_config_version_positive"
  CHECK ("runtimeConfigVersion" > 0),
  ADD CONSTRAINT "tenant_settings_locale_not_blank"
  CHECK (length(trim("locale")) > 0);
