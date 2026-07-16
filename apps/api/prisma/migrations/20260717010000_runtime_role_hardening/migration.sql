-- Make runtime privileges reproducible on a fresh database. Platform control-plane
-- tables stay reachable only through the isolated admin connection.
GRANT USAGE ON SCHEMA public TO app_user;

DO $$
DECLARE
  table_name text;
  platform_tables text[] := ARRAY[
    'platform_users',
    'platform_auth_challenges',
    'platform_sessions',
    'platform_refresh_tokens',
    'platform_mfa_recovery_codes',
    'platform_permissions',
    'platform_role_permissions',
    'system_audit_logs',
    'system_alerts',
    'impersonation_sessions'
  ];
BEGIN
  FOR table_name IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    IF NOT table_name = ANY(platform_tables) THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO app_user',
        table_name
      );
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON TABLE
  platform_users,
  platform_auth_challenges,
  platform_sessions,
  platform_refresh_tokens,
  platform_mfa_recovery_codes,
  platform_permissions,
  platform_role_permissions,
  system_audit_logs,
  system_alerts,
  impersonation_sessions
FROM app_user;

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE tenant_audit_logs FROM app_user;
