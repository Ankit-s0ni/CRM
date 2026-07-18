ALTER TABLE tenant_settings
  ADD COLUMN "regularizationWindowDays" INTEGER NOT NULL DEFAULT 7,
  ADD CONSTRAINT tenant_settings_regularization_window_valid
    CHECK ("regularizationWindowDays" BETWEEN 1 AND 90);

ALTER TABLE attendance_events
  ADD COLUMN "regularizationRequestId" UUID,
  ADD CONSTRAINT attendance_events_regularization_request_fk
    FOREIGN KEY ("regularizationRequestId") REFERENCES regularization_requests(id);

CREATE INDEX attendance_events_regularization_request_idx
  ON attendance_events ("tenantId", "regularizationRequestId");
