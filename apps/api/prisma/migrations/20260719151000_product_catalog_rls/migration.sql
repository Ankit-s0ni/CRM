ALTER TABLE "tenant_capability_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_capability_overrides" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "tenant_capability_overrides"
  TO app_user
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE POLICY platform_access ON "tenant_capability_overrides"
  TO platform_runtime
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON "module_capabilities", "subscription_plan_capabilities"
  TO app_user;
GRANT SELECT ON "tenant_capability_overrides" TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  "module_capabilities", "subscription_plan_capabilities", "tenant_capability_overrides"
  TO platform_runtime;
