CREATE TYPE "ModuleKind" AS ENUM ('PRODUCT', 'ADD_ON');
CREATE TYPE "TenantOverrideMode" AS ENUM ('INHERIT', 'ENABLE', 'DISABLE');

ALTER TABLE "modules"
  ADD COLUMN "kind" "ModuleKind" NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN "parentModuleId" UUID,
  ADD COLUMN "catalogOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "customerVisible" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "modules"
  ADD CONSTRAINT "modules_parentModuleId_fkey"
  FOREIGN KEY ("parentModuleId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "modules_kind_availability_catalogOrder_idx"
  ON "modules"("kind", "availability", "catalogOrder");
CREATE INDEX "modules_parentModuleId_idx" ON "modules"("parentModuleId");

CREATE TABLE "module_capabilities" (
  "id" UUID NOT NULL,
  "moduleId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "availability" "ModuleAvailability" NOT NULL DEFAULT 'AVAILABLE',
  "isCore" BOOLEAN NOT NULL DEFAULT false,
  "configurable" BOOLEAN NOT NULL DEFAULT true,
  "requiredModuleKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dependencyKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "conflictKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "module_capabilities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "module_capabilities_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "module_capabilities_key_key" ON "module_capabilities"("key");
CREATE INDEX "module_capabilities_moduleId_availability_displayOrder_idx"
  ON "module_capabilities"("moduleId", "availability", "displayOrder");

CREATE TABLE "subscription_plan_capabilities" (
  "planId" UUID NOT NULL,
  "capabilityId" UUID NOT NULL,
  "included" BOOLEAN NOT NULL DEFAULT true,
  "limitValue" JSONB,
  CONSTRAINT "subscription_plan_capabilities_pkey" PRIMARY KEY ("planId", "capabilityId"),
  CONSTRAINT "subscription_plan_capabilities_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "subscription_plan_capabilities_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "module_capabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "tenant_capability_overrides" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "capabilityId" UUID NOT NULL,
  "mode" "TenantOverrideMode" NOT NULL,
  "limitValue" JSONB,
  "reason" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "changedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_capability_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_capability_overrides_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "module_capabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tenant_capability_overrides_dates_check" CHECK ("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt")
);

CREATE UNIQUE INDEX "tenant_capability_overrides_tenantId_capabilityId_key"
  ON "tenant_capability_overrides"("tenantId", "capabilityId");
CREATE INDEX "tenant_capability_overrides_tenantId_mode_idx"
  ON "tenant_capability_overrides"("tenantId", "mode");
CREATE INDEX "tenant_capability_overrides_endsAt_idx"
  ON "tenant_capability_overrides"("endsAt");

UPDATE "modules" SET "catalogOrder" = 10 WHERE "key" = 'ATTENDANCE';
UPDATE "modules" field
SET "kind" = 'ADD_ON',
    "parentModuleId" = attendance."id",
    "catalogOrder" = 20,
    "name" = 'Field Workforce Tracking'
FROM "modules" attendance
WHERE field."key" = 'FIELD_TRACKING' AND attendance."key" = 'ATTENDANCE';
UPDATE "modules"
SET "customerVisible" = false, "catalogOrder" = 90
WHERE "key" = 'REGULARIZATION';
UPDATE "modules"
SET "availability" = 'COMING_SOON', "catalogOrder" = 100
WHERE "key" IN ('LEAVE', 'PAYROLL');

INSERT INTO "module_capabilities" (
  "id", "moduleId", "key", "name", "description", "isCore", "configurable", "requiredModuleKeys", "dependencyKeys", "displayOrder"
)
SELECT gen_random_uuid(), module."id", capability."key", capability."name", capability."description",
       capability."isCore", capability."configurable", capability."requiredModuleKeys", capability."dependencyKeys", capability."displayOrder"
FROM "modules" module
CROSS JOIN (VALUES
  ('ATTENDANCE_CORE', 'Attendance check-in and check-out', 'Core attendance recording and daily status', true, true, ARRAY['ATTENDANCE']::TEXT[], ARRAY[]::TEXT[], 10),
  ('ATTENDANCE_REPORTS_BASIC', 'Attendance registers and basic reports', 'Attendance register and standard reports', true, false, ARRAY['ATTENDANCE']::TEXT[], ARRAY['ATTENDANCE_CORE']::TEXT[], 20),
  ('ATTENDANCE_OFFICE_GEOFENCE', 'Office location verification', 'Office geofence based attendance', false, true, ARRAY['ATTENDANCE']::TEXT[], ARRAY['ATTENDANCE_CORE']::TEXT[], 30),
  ('ATTENDANCE_DEVICE_TRUST', 'Registered device verification', 'Registered device controls for attendance', false, true, ARRAY['ATTENDANCE']::TEXT[], ARRAY['ATTENDANCE_CORE']::TEXT[], 40),
  ('ATTENDANCE_SELFIE', 'Selfie verification', 'Optional selfie verification for attendance', false, true, ARRAY['ATTENDANCE']::TEXT[], ARRAY['ATTENDANCE_CORE']::TEXT[], 50),
  ('ATTENDANCE_SHIFTS_ROSTERS', 'Shifts and rosters', 'Shift definitions and dated roster assignments', false, true, ARRAY['ATTENDANCE']::TEXT[], ARRAY['ATTENDANCE_CORE']::TEXT[], 60),
  ('ATTENDANCE_REGULARIZATION', 'Attendance correction requests', 'Employee correction requests and approval workflow', false, true, ARRAY['ATTENDANCE']::TEXT[], ARRAY['ATTENDANCE_CORE']::TEXT[], 70),
  ('ATTENDANCE_REPORTS_ADVANCED', 'Advanced attendance reports', 'Late, overtime and violation reporting', false, false, ARRAY['ATTENDANCE']::TEXT[], ARRAY['ATTENDANCE_REPORTS_BASIC']::TEXT[], 80),
  ('ATTENDANCE_PAYROLL_EXPORT', 'Payroll-ready export and period lock', 'Payroll export, lock, reopen and reconciliation', false, true, ARRAY['ATTENDANCE']::TEXT[], ARRAY['ATTENDANCE_REPORTS_BASIC']::TEXT[], 90),
  ('ATTENDANCE_FIELD_TRACKING', 'Field Workforce Tracking', 'Field GPS, offline sync, live location and routes', false, true, ARRAY['ATTENDANCE', 'FIELD_TRACKING']::TEXT[], ARRAY['ATTENDANCE_CORE']::TEXT[], 100)
) AS capability("key", "name", "description", "isCore", "configurable", "requiredModuleKeys", "dependencyKeys", "displayOrder")
WHERE module."key" = 'ATTENDANCE'
ON CONFLICT ("key") DO NOTHING;

-- Preserve currently available Attendance behavior for every existing plan.
INSERT INTO "subscription_plan_capabilities" ("planId", "capabilityId", "included")
SELECT DISTINCT plan_module."planId", capability."id", true
FROM "subscription_plan_modules" plan_module
JOIN "modules" module ON module."id" = plan_module."moduleId" AND module."key" = 'ATTENDANCE'
JOIN "module_capabilities" capability ON capability."moduleId" = module."id"
WHERE capability."key" <> 'ATTENDANCE_FIELD_TRACKING'
ON CONFLICT ("planId", "capabilityId") DO NOTHING;

INSERT INTO "subscription_plan_capabilities" ("planId", "capabilityId", "included")
SELECT DISTINCT plan_module."planId", capability."id", true
FROM "subscription_plan_modules" plan_module
JOIN "modules" module ON module."id" = plan_module."moduleId" AND module."key" = 'FIELD_TRACKING'
JOIN "module_capabilities" capability ON capability."key" = 'ATTENDANCE_FIELD_TRACKING'
ON CONFLICT ("planId", "capabilityId") DO NOTHING;
