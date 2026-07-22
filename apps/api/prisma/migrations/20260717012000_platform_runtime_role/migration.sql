-- platform_runtime is created by scripts/init-db-roles.sql before migrations.
GRANT USAGE ON SCHEMA public TO platform_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO platform_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE app_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO platform_runtime;

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE
  system_audit_logs,
  tenant_audit_logs
FROM platform_runtime;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE  table_schema = 'public' 
    AND    table_name   = '_prisma_migrations'
  ) THEN
    EXECUTE 'REVOKE ALL ON TABLE _prisma_migrations FROM platform_runtime';
  END IF;
END $$;
