-- Separate workspace-owner dashboard additions from the shared HR live board.

INSERT INTO "permissions" ("id", "key")
SELECT gen_random_uuid(), 'workspace.dashboard.admin.read'
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions"
  WHERE "key" = 'workspace.dashboard.admin.read'
);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r
JOIN "permissions" p
  ON p."key" = 'workspace.dashboard.admin.read'
WHERE r."name" = 'BUSINESS_ADMIN'
  AND r."isSystem" = true
ON CONFLICT DO NOTHING;
