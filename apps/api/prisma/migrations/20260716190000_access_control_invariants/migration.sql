-- Sprint 1.3 tenant access-control identity invariants.

CREATE UNIQUE INDEX "roles_tenant_name_ci_uq"
  ON "roles" ("tenantId", lower("name"))
  WHERE "tenantId" IS NOT NULL;

CREATE UNIQUE INDEX "users_tenant_email_ci_uq"
  ON "users" ("tenantId", lower("email"));
