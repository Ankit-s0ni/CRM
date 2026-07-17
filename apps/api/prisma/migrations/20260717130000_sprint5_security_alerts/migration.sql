ALTER TYPE "AlertRuleType" ADD VALUE IF NOT EXISTS 'ROOTED_DEVICE';
ALTER TYPE "AlertRuleType" ADD VALUE IF NOT EXISTS 'DEVICE_MISMATCH';
ALTER TYPE "SecurityAlertType" ADD VALUE IF NOT EXISTS 'DEVICE_MISMATCH';

CREATE INDEX IF NOT EXISTS "security_alerts_tenantId_verificationLogId_idx"
  ON "security_alerts"("tenantId", "verificationLogId");

ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON alert_rules;
CREATE POLICY tenant_isolation ON alert_rules
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON security_alerts;
CREATE POLICY tenant_isolation ON security_alerts
  USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON alert_rules, security_alerts TO app_user;

