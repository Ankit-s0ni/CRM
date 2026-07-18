DROP INDEX attendance_sync_receipts_idempotency_uq;

CREATE UNIQUE INDEX attendance_sync_receipts_tenant_event_uq
  ON attendance_sync_receipts ("tenantId", "clientEventUuid");
