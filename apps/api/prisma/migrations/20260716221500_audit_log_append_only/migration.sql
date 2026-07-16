-- Tenant audit records are append-only for the runtime application role.
-- Keep this revoke after broad application-role grants in database bootstrap.
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "tenant_audit_logs" FROM app_user;
