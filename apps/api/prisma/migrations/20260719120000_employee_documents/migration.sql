CREATE TABLE employee_documents (
  id UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "documentType" TEXT NOT NULL,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "objectKey" TEXT NOT NULL,
  "uploadedBy" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_documents_employee_fk
    FOREIGN KEY ("employeeId") REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX employee_documents_employee_idx
  ON employee_documents ("tenantId", "employeeId", "createdAt");
CREATE INDEX employee_documents_type_idx
  ON employee_documents ("tenantId", "documentType");

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_documents
  USING ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK ("tenantId" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON employee_documents TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_documents TO platform_runtime;
