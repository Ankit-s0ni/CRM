-- Sprint 1 organization and subscription invariants.

CREATE UNIQUE INDEX "subscription_plans_name_key"
  ON "subscription_plans" ("name");

CREATE UNIQUE INDEX "tenant_subscriptions_one_current_uq"
  ON "tenant_subscriptions" ("tenantId")
  WHERE "status" IN ('TRIALING', 'ACTIVE', 'PAST_DUE');

CREATE UNIQUE INDEX "departments_root_name_ci_uq"
  ON "departments" ("tenantId", lower("name"))
  WHERE "parentDeptId" IS NULL;

CREATE UNIQUE INDEX "departments_sibling_name_ci_uq"
  ON "departments" ("tenantId", "parentDeptId", lower("name"))
  WHERE "parentDeptId" IS NOT NULL;

CREATE UNIQUE INDEX "designations_name_ci_uq"
  ON "designations" ("tenantId", lower("name"));

CREATE UNIQUE INDEX "employees_code_ci_uq"
  ON "employees" ("tenantId", lower("employeeCode"));

CREATE UNIQUE INDEX "employees_phone_uq"
  ON "employees" ("tenantId", "phone")
  WHERE "phone" IS NOT NULL;
