DROP POLICY IF EXISTS tenant_isolation ON alert_rules;
CREATE POLICY tenant_isolation ON alert_rules
  USING (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

DROP POLICY IF EXISTS tenant_isolation ON security_alerts;
CREATE POLICY tenant_isolation ON security_alerts
  USING (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

-- Verification attempts are forensic evidence: runtime may append and read only.
REVOKE UPDATE, DELETE ON attendance_verification_logs FROM app_user;
