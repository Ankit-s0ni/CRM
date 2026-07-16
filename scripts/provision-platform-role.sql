-- Run as a PostgreSQL administrator before migrations on an existing database.
DO $provision$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_runtime') THEN
    CREATE ROLE platform_runtime LOGIN PASSWORD 'platform_password' BYPASSRLS;
  END IF;
END
$provision$;

DO $provision$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO platform_runtime', current_database());
END
$provision$;
