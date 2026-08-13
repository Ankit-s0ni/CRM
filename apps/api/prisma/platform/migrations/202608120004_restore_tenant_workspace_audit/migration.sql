-- Tenant-facing workspace administration writes a distinct audit trail. This
-- remains Platform-owned and is intentionally separate from HRMS business
-- audit data stored in the HRMS database.
CREATE TABLE "tenant_audit_logs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "actorUserId" UUID,
    "impersonationSessionId" UUID,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" UUID,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tenant_audit_logs_tenantId_module_createdAt_idx"
    ON "tenant_audit_logs"("tenantId", "module", "createdAt");

CREATE INDEX "tenant_audit_logs_tenantId_entityType_entityId_idx"
    ON "tenant_audit_logs"("tenantId", "entityType", "entityId");
