-- Give managers reporting-chain access instead of tenant-wide employee access.

INSERT INTO "permissions" ("id", "key")
SELECT gen_random_uuid(), 'organization.employees.reports.read'
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions"
  WHERE "key" = 'organization.employees.reports.read'
);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p
  ON p."key" = 'organization.employees.reports.read'
WHERE r."name" = 'MANAGER'
  AND r."isSystem" = true
ON CONFLICT DO NOTHING;

DELETE FROM "role_permissions" rp
USING "roles" r, "permissions" p
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND r."name" = 'MANAGER'
  AND r."isSystem" = true
  AND p."key" = 'organization.employees.read';
