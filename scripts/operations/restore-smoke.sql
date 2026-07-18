\set ON_ERROR_STOP on

SELECT CASE WHEN COUNT(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS migrations_present
FROM "_prisma_migrations"
WHERE "finished_at" IS NOT NULL;

SELECT CASE WHEN to_regclass('public.tenants') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
  AS tenants_table_present;
SELECT CASE WHEN to_regclass('public.attendance_events') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
  AS attendance_table_present;
SELECT CASE WHEN to_regclass('public.tenant_invoices') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END
  AS invoices_table_present;

SELECT COUNT(*) AS invalid_tenant_users
FROM users AS user_record
LEFT JOIN tenants ON tenants.id = user_record."tenantId"
WHERE tenants.id IS NULL;
