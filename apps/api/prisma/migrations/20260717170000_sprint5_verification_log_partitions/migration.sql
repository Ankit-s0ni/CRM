ALTER TABLE attendance_verification_logs
  RENAME TO attendance_verification_logs_old;

CREATE TABLE attendance_verification_logs (
  LIKE attendance_verification_logs_old INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE ("verifiedAt");

-- PostgreSQL requires every unique key to contain the partition key.
CREATE UNIQUE INDEX attendance_verification_logs_id_verifiedAt_key
  ON attendance_verification_logs(id, "verifiedAt");
CREATE INDEX attendance_verification_logs_tenantId_employeeId_verifiedAt_idx
  ON attendance_verification_logs("tenantId", "employeeId", "verifiedAt");
CREATE INDEX attendance_verification_logs_tenantId_verificationStatus_verifiedAt_idx
  ON attendance_verification_logs("tenantId", "verificationStatus", "verifiedAt");

CREATE TABLE attendance_verification_logs_2026_07
  PARTITION OF attendance_verification_logs
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE attendance_verification_logs_2026_08
  PARTITION OF attendance_verification_logs
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE attendance_verification_logs_2026_09
  PARTITION OF attendance_verification_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE attendance_verification_logs_default
  PARTITION OF attendance_verification_logs DEFAULT;

INSERT INTO attendance_verification_logs
  SELECT * FROM attendance_verification_logs_old;
DROP TABLE attendance_verification_logs_old;

ALTER TABLE attendance_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_verification_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attendance_verification_logs
  USING (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    "tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

GRANT SELECT, INSERT ON attendance_verification_logs TO app_user;
REVOKE UPDATE, DELETE ON attendance_verification_logs FROM app_user;
