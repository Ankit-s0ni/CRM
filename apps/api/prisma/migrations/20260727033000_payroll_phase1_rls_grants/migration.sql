-- Payroll Phase 1 runtime access hardening.
-- The app connection uses app_user with tenant RLS. Payroll tables created in
-- the foundation migration must grant app_user access and enforce tenant scope.

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'payroll_settings',
    'payroll_calendars',
    'pay_groups',
    'pay_group_employee_assignments',
    'payroll_policies',
    'payroll_policy_versions',
    'pay_components',
    'pay_component_versions',
    'salary_structures',
    'salary_structure_versions',
    'salary_structure_version_components',
    'employee_payroll_profiles',
    'employee_compensation_versions',
    'employee_payment_details',
    'employee_statutory_details',
    'payroll_approval_policies',
    'payroll_approval_policy_versions',
    'payroll_accounting_mappings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO app_user USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO app_user', table_name);
  END LOOP;
END $$;

