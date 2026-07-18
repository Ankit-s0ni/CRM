-- Sprint 6 field tracking and offline replay durability.

ALTER TYPE "TrackingEndReason" ADD VALUE IF NOT EXISTS 'ADMINISTRATOR';
CREATE TYPE "FieldIngestionStatus" AS ENUM ('PENDING', 'PROCESSED', 'REJECTED');
CREATE TYPE "AttendanceSyncStatus" AS ENUM ('ACCEPTED', 'RETRYABLE', 'REJECTED');

ALTER TABLE field_tracking_sessions
  ADD COLUMN "clientStartUuid" uuid,
  ADD COLUMN "lastPingAt" timestamp(3),
  ADD COLUMN "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE field_tracking_sessions
SET
  "deviceId" = COALESCE("deviceId", gen_random_uuid()),
  "clientStartUuid" = gen_random_uuid();

ALTER TABLE field_tracking_sessions
  ALTER COLUMN "deviceId" SET NOT NULL,
  ALTER COLUMN "clientStartUuid" SET NOT NULL,
  ALTER COLUMN "startedAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX field_tracking_sessions_start_idempotency_uq
  ON field_tracking_sessions ("tenantId", "employeeId", "clientStartUuid");
CREATE UNIQUE INDEX field_tracking_sessions_active_employee_uq
  ON field_tracking_sessions ("tenantId", "employeeId")
  WHERE "endedAt" IS NULL;
CREATE UNIQUE INDEX field_tracking_sessions_active_device_uq
  ON field_tracking_sessions ("tenantId", "deviceId")
  WHERE "endedAt" IS NULL;
CREATE INDEX field_tracking_sessions_device_active_idx
  ON field_tracking_sessions ("tenantId", "deviceId", "endedAt");

-- A partitioned table cannot enforce client UUID uniqueness unless the
-- partition key is included. field_ping_receipts owns that durable invariant.
ALTER TABLE field_location_pings
  ADD COLUMN "deviceId" uuid,
  ADD COLUMN "clientPingUuid" uuid,
  ADD COLUMN "receivedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE field_location_pings ping
SET
  "deviceId" = COALESCE(session."deviceId", gen_random_uuid()),
  "clientPingUuid" = gen_random_uuid()
FROM field_tracking_sessions session
WHERE session.id = ping."sessionId";

UPDATE field_location_pings
SET
  "deviceId" = COALESCE("deviceId", gen_random_uuid()),
  "clientPingUuid" = COALESCE("clientPingUuid", gen_random_uuid());

ALTER TABLE field_location_pings
  ALTER COLUMN "deviceId" SET NOT NULL,
  ALTER COLUMN "clientPingUuid" SET NOT NULL;

ALTER TABLE field_location_pings RENAME TO field_location_pings_old;

CREATE TABLE field_location_pings (
  LIKE field_location_pings_old INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE ("capturedAt");

CREATE UNIQUE INDEX field_location_pings_id_capturedAt_key
  ON field_location_pings (id, "capturedAt");
CREATE INDEX field_location_pings_employee_captured_idx
  ON field_location_pings ("tenantId", "employeeId", "capturedAt");
CREATE INDEX field_location_pings_session_captured_idx
  ON field_location_pings ("tenantId", "sessionId", "capturedAt");

CREATE TABLE field_location_pings_2026_07
  PARTITION OF field_location_pings
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE field_location_pings_2026_08
  PARTITION OF field_location_pings
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE field_location_pings_2026_09
  PARTITION OF field_location_pings
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE field_location_pings_default
  PARTITION OF field_location_pings DEFAULT;

INSERT INTO field_location_pings SELECT * FROM field_location_pings_old;
DROP TABLE field_location_pings_old;

ALTER TABLE field_location_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_location_pings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON field_location_pings
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE field_ping_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "sessionId" uuid NOT NULL,
  "employeeId" uuid NOT NULL,
  "deviceId" uuid NOT NULL,
  "clientPingUuid" uuid NOT NULL,
  "payloadHash" text NOT NULL,
  status "FieldIngestionStatus" NOT NULL DEFAULT 'PENDING',
  "errorCode" text,
  "pingId" uuid,
  "capturedAt" timestamp(3) NOT NULL,
  "processedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX field_ping_receipts_idempotency_uq
  ON field_ping_receipts ("tenantId", "deviceId", "clientPingUuid");
CREATE INDEX field_ping_receipts_processing_idx
  ON field_ping_receipts ("tenantId", "sessionId", status, "createdAt");

ALTER TABLE field_route_summaries
  ADD COLUMN stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "sourceStartedAt" timestamp(3),
  ADD COLUMN "sourceEndedAt" timestamp(3),
  ADD COLUMN "algorithmVersion" integer NOT NULL DEFAULT 1,
  ADD COLUMN "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE attendance_sync_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL,
  "employeeId" uuid NOT NULL,
  "clientEventUuid" uuid NOT NULL,
  "payloadHash" text NOT NULL,
  status "AttendanceSyncStatus" NOT NULL,
  "attendanceEventId" uuid,
  "errorCode" text,
  message text,
  "regularizationSuggested" boolean NOT NULL DEFAULT false,
  "clientTime" timestamp(3) NOT NULL,
  outcome jsonb NOT NULL,
  "processedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX attendance_sync_receipts_idempotency_uq
  ON attendance_sync_receipts ("tenantId", "employeeId", "clientEventUuid");
CREATE INDEX attendance_sync_receipts_employee_processed_idx
  ON attendance_sync_receipts ("tenantId", "employeeId", "processedAt");

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'field_ping_receipts',
    'attendance_sync_receipts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK ("tenantId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON field_tracking_sessions TO app_user;
GRANT SELECT, INSERT ON field_location_pings TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON field_ping_receipts TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON field_route_summaries TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_sync_receipts TO app_user;
REVOKE UPDATE, DELETE ON field_location_pings FROM app_user;

INSERT INTO permissions (id, key)
SELECT gen_random_uuid(), permission_key
FROM unnest(ARRAY[
  'attendance.field.live.read',
  'attendance.field.routes.read'
]) AS permission_key
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions ("roleId", "permissionId")
SELECT role.id, permission.id
FROM roles role
JOIN permissions permission
  ON permission.key IN (
    'attendance.field.live.read',
    'attendance.field.routes.read'
  )
WHERE role.name IN ('BUSINESS_ADMIN', 'HR_ADMIN', 'MANAGER')
  AND role."isSystem" = true
ON CONFLICT DO NOTHING;
