-- ---------------------------------------------------------------
-- 01-roles.sql
-- Runs automatically when the Postgres container starts.
-- ---------------------------------------------------------------

-- app_user: the role the NestJS app connects as (NO BYPASSRLS)
CREATE ROLE app_user LOGIN PASSWORD 'app_password';

-- app_admin: for migrations and super-admin portal (BYPASSRLS)
CREATE ROLE app_admin LOGIN PASSWORD 'admin_password' BYPASSRLS;

-- Runtime-only connection for platform repositories.
CREATE ROLE platform_runtime LOGIN PASSWORD 'platform_password' BYPASSRLS;

-- Grant permissions on the database
GRANT ALL PRIVILEGES ON DATABASE hrms_dev TO app_admin;
GRANT CONNECT ON DATABASE hrms_dev TO app_user;
GRANT CONNECT ON DATABASE hrms_dev TO platform_runtime;
