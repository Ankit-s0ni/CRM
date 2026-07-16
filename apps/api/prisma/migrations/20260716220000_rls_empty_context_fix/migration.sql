-- Fail closed when app.tenant_id is missing or reset to an empty string.

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'tenant_settings', 'tenant_billing_profiles', 'users',
    'verification_tokens', 'departments', 'designations', 'employees',
    'employment_events', 'import_jobs', 'employee_import_rows',
    'office_locations', 'employee_office_assignments', 'policy_assignments',
    'shifts', 'employee_shift_rosters', 'tenant_holidays',
    'registered_devices', 'attendance_logs', 'attendance_events',
    'attendance_verification_logs', 'attendance_exceptions',
    'regularization_requests', 'field_tracking_sessions',
    'field_location_pings', 'field_route_summaries', 'biometric_consents',
    'tenant_audit_logs', 'report_exports', 'payroll_lock_periods',
    'leave_balances', 'leave_requests', 'notifications',
    'notification_preferences'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($policy$
      CREATE POLICY tenant_isolation ON %I
        USING (
          "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        WITH CHECK (
          "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
    $policy$, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS tenant_isolation ON roles;
CREATE POLICY tenant_isolation ON roles
  USING (
    "tenantId" IS NULL
    OR "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
