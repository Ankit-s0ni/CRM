-- Leave is delivered inside Attendance. Keep the legacy module row only so
-- historical tenant assignments and audit records remain readable.
UPDATE "modules"
SET "availability" = 'DEPRECATED',
    "customerVisible" = false,
    "catalogOrder" = 100
WHERE "key" = 'LEAVE';

INSERT INTO "module_capabilities" (
  "id", "moduleId", "key", "name", "description", "availability",
  "isCore", "configurable", "requiredModuleKeys", "dependencyKeys",
  "conflictKeys", "displayOrder", "createdAt", "updatedAt"
)
SELECT gen_random_uuid(), "id", 'ATTENDANCE_LEAVE',
       'Leave requests and approvals',
       'Tenant-wide leave policies, balances, employee requests and approvals',
       'AVAILABLE', true, true, ARRAY['ATTENDANCE']::TEXT[],
       ARRAY['ATTENDANCE_CORE']::TEXT[], ARRAY[]::TEXT[], 75,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "modules"
WHERE "key" = 'ATTENDANCE'
ON CONFLICT ("key") DO UPDATE SET
  "moduleId" = EXCLUDED."moduleId",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "availability" = EXCLUDED."availability",
  "isCore" = EXCLUDED."isCore",
  "configurable" = EXCLUDED."configurable",
  "requiredModuleKeys" = EXCLUDED."requiredModuleKeys",
  "dependencyKeys" = EXCLUDED."dependencyKeys",
  "displayOrder" = EXCLUDED."displayOrder",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Every plan that includes Attendance also includes its simple Leave workflow.
INSERT INTO "subscription_plan_capabilities" ("planId", "capabilityId", "included")
SELECT plan_module."planId", capability."id", true
FROM "subscription_plan_modules" plan_module
JOIN "modules" attendance
  ON attendance."id" = plan_module."moduleId"
 AND attendance."key" = 'ATTENDANCE'
JOIN "module_capabilities" capability
  ON capability."key" = 'ATTENDANCE_LEAVE'
ON CONFLICT ("planId", "capabilityId") DO UPDATE SET "included" = true;
