ALTER TABLE "system_alerts"
  ADD COLUMN "acknowledgedNote" TEXT,
  ADD COLUMN "resolvedBy" UUID,
  ADD COLUMN "resolvedNote" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "system_audit_logs" ADD COLUMN "tenantId" UUID;

CREATE INDEX "system_audit_logs_tenantId_createdAt_idx"
  ON "system_audit_logs"("tenantId", "createdAt");
CREATE INDEX "system_audit_logs_module_createdAt_idx"
  ON "system_audit_logs"("module", "createdAt");
CREATE INDEX "system_audit_logs_action_createdAt_idx"
  ON "system_audit_logs"("action", "createdAt");
