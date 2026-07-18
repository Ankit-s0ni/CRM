-- One-time, tenant/device-bound challenges for production mobile attestation.
CREATE TABLE device_integrity_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "employeeId" uuid NOT NULL,
  "deviceId" uuid NOT NULL,
  "nonceHash" text NOT NULL,
  action text NOT NULL,
  "expiresAt" timestamp(3) NOT NULL,
  "consumedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX device_integrity_challenges_device_expiry_idx
  ON device_integrity_challenges ("tenantId", "deviceId", "expiresAt");
CREATE INDEX device_integrity_challenges_pending_idx
  ON device_integrity_challenges ("tenantId", "consumedAt", "expiresAt");

ALTER TABLE device_integrity_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_integrity_challenges FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON device_integrity_challenges
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON device_integrity_challenges TO app_user;
